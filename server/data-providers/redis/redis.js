'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const REDIS = require('redis');
const Bluebird = require('bluebird');
const DataProvider = require('../../utils/data-provider');
const logger = require('../../utils/logger')('redisProvider');

class RedisProvider extends DataProvider {
    constructor() {
        super();
        const vcapJson = JSON.parse(process.env.VCAP_SERVICES);
        if (vcapJson['compose-for-redis'] && vcapJson['compose-for-redis'].length) {
            this.uri = vcapJson['compose-for-redis'][0].credentials.uri;
            this.ca_certificate_base64 = vcapJson['compose-for-redis'][0].credentials.ca_certificate_base64;
        } else if (vcapJson['databases-for-redis'] && vcapJson['databases-for-redis'].length) {
            this.uri = vcapJson['databases-for-redis'][0].credentials.connection.rediss.composed[0];
        } else {
            logger.error(
                'ERROR: Your REDIS config uses a different REDIS provider URI. ' +
                    'Please use compose-for-redis or databases-for-redis.'
            );
        }
    }

    register() {
        return new Promise((resolve, reject) => {

            let redisOptions = {};
            if (this.ca_certificate_base64) {
                redisOptions.tls = { ca: [new Buffer(this.ca_certificate_base64, 'base64')]};
            }
            const redis = REDIS.createClient(this.uri, redisOptions);
            this.client = Bluebird.promisifyAll(redis);

            const connectHandler = () => {
                resolve();
                this.client.removeListener('connect', connectHandler);
                this.client.removeListener('error', errorHandler);

                // Log any system errors after connection established
                this.client.on('error', err => {
                    logger.error('Redis error: ', err);
                });
            };

            const errorHandler = err => {
                reject(err);
                this.client.removeListener('connect', connectHandler);
                this.client.removeListener('error', errorHandler);
            };

            // Listen for connect / error messages to drive resolve / reject
            // Once finished, remove listeners so they don't attempt to
            // invoke resolve / reject again
            this.client.on('connect', connectHandler);
            this.client.on('error', errorHandler);
            logger.info('Registered: \t\t' + this.sourceId());
        });
    }

    deleteMultipleKeys(keysQuery) {
        return new Promise((resolve, reject) => {
            this.client.keys(keysQuery, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    let delPromises = [];
                    rows.forEach(rowKey => {
                        const rowDelete = this.client.delAsync(rowKey);
                        delPromises.push(rowDelete);
                    });

                    Promise.all(delPromises)
                        .then(() => {
                            resolve('Deleted ' + delPromises.length + ' REDIS keys');
                        })
                        .catch(err => {
                            reject(err);
                        });
                }
            });
        });
    }

    sourceId() {
        return 'redis';
    }
}

module.exports = RedisProvider;
