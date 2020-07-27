'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const CloudantConstants = require('../data-providers/cloudant/cloudant-constants');
const geocode = require('../services/geocoder-service');
const logger = require('../utils/logger')('profile');

class Profile {
    constructor(cloudant) {
        this.cloudant = cloudant;
        this.profile = {
            socialMediaUserId: '',
            sessionId: '',
            age: '',
            gender: '',
            locationName: '',
            locationData: null,
            campaigns: {}
        };
    }

    async init(sessionId) {
        const existingProfile = await this.cloudant.read(
            CloudantConstants.DATABASE_PROFILES,
            CloudantConstants.getProfile(sessionId)
        );
        logger.debug('Profile exists in database', existingProfile);
        if (existingProfile.length) {
            this.profile = existingProfile[0];
            logger.debug('User profile ready to be updated', this.profile);
        }
    }

    async updateFromContextSetCampaignStarted(response) {
        try {
            this.profile['socialMediaUserId'] = response.socialMediaUserId;
            this.profile['sessionId'] = response.sessionId;
            await this.startCampaign(response.campaignId);
        } catch (err) {
            logger.error('Error updating responder profile from cloudant', err);
            throw err;
        }
    }

    async updateLocationCoordinates() {
        logger.info('Getting participant profile location.');
        try {
            const locationData = await geocode(this.profile.locationName);
            this.profile.locationData = locationData || null;
        } catch (geoErr) {
            logger.error('Error fetching location: ', geoErr);
            throw geoErr;
        }
    }

    async startCampaign(campaignId) {
        this.profile.campaigns = this.profile.campaigns || {};
        this.profile.campaigns[campaignId] = {
            started: new Date().toISOString(),
            finished: false
        };
        logger.info(`User starting campaign: ${campaignId}`);
    }

    async finishCampaign(campaignId) {
        if (this.profile.campaigns[campaignId]) {
            this.profile.campaigns[campaignId].finished = new Date().toISOString();
            logger.info(`User finished campaign: ${campaignId}`);
        }
    }

    async save() {
        try {
            this.profile.updated = new Date().toISOString();
            if (this.profile._id) {
                await this.cloudant.update(CloudantConstants.DATABASE_PROFILES, this.profile);
                logger.info('Existing participant profile updated.');
            } else {
                await this.cloudant.create(CloudantConstants.DATABASE_PROFILES, this.profile);
                logger.info('New participant profile created.');
            }
        } catch (err) {
            logger.error('Error saving profile to db', err);
            throw err;
        }
    }
}

module.exports = Profile;
