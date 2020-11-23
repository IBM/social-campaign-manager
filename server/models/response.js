/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */


const cryptoService = require('../services/crypto-service');

class Response {
    constructor(twitterDmObj) {

        let dmResponse = {
            campaignId: '',
            socialMediaObjectType: 'direct-message',
            socialMediaUserId: twitterDmObj.sender.senderId ? cryptoService.encrypt(twitterDmObj.sender.senderId) : '',
            rawMessage: twitterDmObj.text,
            location: twitterDmObj.sender.location,
            timestamp: new Date().toISOString(),
            dialogNode: '',
            nlu: null,
            language: 'en',
            isUnknownResponse: false,
            recognisedPredefinedAnswer: []
        };
        return dmResponse;
    }
}

module.exports = Response;
