/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */


const cryptoService = require('../services/crypto-service');
const USE_ENCRYPTION = (process.env.USE_ENCRYPTION !== 'false');

class Response {
    constructor(msgObj) {

        let dmResponse = {
            campaignId: '',
            socialMediaObjectType: 'direct-message',
            socialMediaUserId: msgObj.sender.senderId
                ? (USE_ENCRYPTION ? cryptoService.encrypt(msgObj.sender.senderId) : msgObj.sender.senderId)
                : '',
            rawMessage: msgObj.text,
            location: msgObj.sender.location,
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
