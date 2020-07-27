'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const logger = require('../utils/logger')('nluService');

class NLUService {
    constructor() {
        try {
            const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
            const credentials = vcapServices['natural-language-understanding'][0].credentials;
            const apiKey = credentials.apikey;
            this.client = new NaturalLanguageUnderstandingV1({
                iam_apikey: apiKey,
                version: '2018-03-16'
            });
        } catch (error) {
            throw error;
        }
    }

    async analyse(text, features, language = 'en') {
        let parameters = { text: text, features: features, language: language };
        try {
            const analysisStart = new Date();
            const nluAnalysis = await this.client.analyze(parameters);
            const analysisFinished = (new Date() - analysisStart);
            logger.info('[Performance] NLU_RESPONSE in ' + analysisFinished + ' millis');
            logger.debug('[nluAnalysis]', nluAnalysis);
            return nluAnalysis;
        } catch (error) {
            logger.error('[analyse] Error analysing NLU', error);
            throw error;
        }
    }
}

module.exports = NLUService;
