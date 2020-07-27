/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const logger = require('../utils/logger')('ThrottleService');

const THROTTLE_DECLINED_KEY = 'throttleDeclinedCount';
const THROTTLE_NEW_RESPONDERS = 'throttleNewResponderCount';
const THROTTLE_SIZE_KEY = 'throttleSize';
const THROTTLE_REFRESH_INTERVAL = 'throttleRefreshInterval';

class ThrottleService {
    constructor(redis) {
        this.redis = redis;
        // Set default throttling value on app start
        this.numberOfUsersAllowed = 200;
    }

    async init() {
        this._initialiseKey(THROTTLE_DECLINED_KEY);
        this._initialiseKey(THROTTLE_NEW_RESPONDERS);
        this._initialiseKey(THROTTLE_SIZE_KEY, 200);
        this._initialiseKey(THROTTLE_REFRESH_INTERVAL, 3600);

        this._refreshAllowedUsersConfigInterval();
    }

    async getConfigKeys() {
        const throttleNewResponderCount = await this.get(THROTTLE_NEW_RESPONDERS);
        const throttleDeclinedCount = await this.get(THROTTLE_DECLINED_KEY);
        const throttleSize = await this.get(THROTTLE_SIZE_KEY);
        const throttleRefreshInterval = await this.get(THROTTLE_REFRESH_INTERVAL);
        return {
            throttleNewResponderCount,
            throttleDeclinedCount,
            throttleSize,
            throttleRefreshInterval
        };
    }

    async get(key) {
        try {
            const redisValue = await this.redis.getAsync(key);
            return parseInt(redisValue, 10);
        } catch (err) {
            logger.error('Error retrieving: ' + key, err);
            throw err;
        }
    }

    async set(key, value) {
        try {
            if (Number(value) !== value) {
                throw new Error('Throttle value must be a number');
            }

            await this.redis.setAsync(key, value);
            this._refreshConfig();
        } catch (err) {
            logger.error('Error setting: ' + key, err);
            throw new Error('Error setting throttle key', err);
        }
    }

    async delete(throttleKey) {
        try {
            await this.redis.delAsync(throttleKey);
        } catch (err) {
            logger.error('Error deleting: ' + throttleKey, err);
            throw new Error('Error deleting ', err);
        }
    }

    async throttle(userId) {
        const activeKey = 'active_' + userId;

        try {
            const active = await this.get(activeKey);
            logger.info('CHECK_USER_IS_ACTIVE - user is ' + active);
            if (active) {
                logger.info('Reset expiry on active user record', 'REFRESH_ACTIVE_USER');
                this.redis.setAsync(activeKey, 1, 'EX', 60);
            } else {
                await this._checkUserCanBeAllowedIn(activeKey);
            }
        } catch (err) {
            throw err;
        }
    }


    async _checkUserCanBeAllowedIn(activeKey) {
        logger.info('Checking if can be allowed in', 'USER_NOT_ACTIVE');
        let activeUsers;
        try {
            activeUsers = await this.redis.keysAsync('active_*');
        } catch (err) {
            logger.error('Error counting active users, allowing user in, set to 0');
            activeUsers = 0;
        }
        const activeUsersCount = activeUsers.length;

        logger.info('NUMBER_OF_ACTIVE_USERS', activeUsersCount);
        if (activeUsersCount < this.numberOfUsersAllowed) {
            this._setUserActive(activeKey);
        } else {
            this._updateThrottleCounter(THROTTLE_DECLINED_KEY);
            throw new Error('Too many users. Send throttling message.');
        }
    }

    _setUserActive(activeKey) {
        logger.info('Setting user active', 'USER_MADE_ACTIVE');
        this.redis.setAsync(activeKey, 1, 'EX', 60);
        this._updateThrottleCounter(THROTTLE_NEW_RESPONDERS);
        // process the DM as normal
    }


    async _initialiseKey(key, defaultValue) {
        const existingValue = await this.get(key);
        if (!existingValue && existingValue != 0) {
            logger.info(`Throttle Key ${key} was not set in Redis, creating...`);
            const val = defaultValue ? defaultValue : 0;
            this.set(key, val);
        }
    }

    async _refreshConfig() {
        logger.info('Fetching throttle config');
        this.throttleRefreshInterval = await this.get(THROTTLE_REFRESH_INTERVAL);
        this.numberOfUsersAllowed = await this.get(THROTTLE_SIZE_KEY);
    }

    async _refreshAllowedUsersConfigInterval() {
        try {
            await this._refreshConfig();
            setTimeout(async () => this._refreshAllowedUsersConfigInterval(), this.throttleRefreshInterval * 1000);
        } catch (err) {
            logger.error('Error fetching number of allowed users');
        }
    }

    async _updateThrottleCounter(throttleCounterKey) {
        logger.info('Updating the number of declined users', 'UPDATE_THROTTLE_DECLINED_COUNT');
        try {
            const respondersCount = await this.get(throttleCounterKey);
            await this.set(throttleCounterKey, parseInt(respondersCount, 10) + 1);
        } catch (err) {
            logger.error('Error updating throttleDeclinedCount', err);
        }
    }
}

module.exports = ThrottleService;
