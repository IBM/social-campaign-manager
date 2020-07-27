/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const crypto = require('crypto'),
    express = require('express'),
    router = express.Router(),
    logger = require('../server/utils/logger')('twitterRouter');

const twitterConsumerSecret = process.env.TWITTER_CONSUMER_SECRET;
const SECURE_TWITTER_WEBHOOK = process.env.SECURE_TWITTER_WEBHOOK;

let directMessagingActionHandler;

router.use((req, res, next) => {
    directMessagingActionHandler = req.directMessagingActionHandler;
    next();
});

router.get('/webhook/twitter', (req, res) => {
    const crc_token = req.query.crc_token;
    if (!twitterConsumerSecret) {
        res.status(500).send('Error: TWITTER CONFIG missing.');
    } else if (crc_token) {
        const hash = crypto
            .createHmac('sha256', twitterConsumerSecret)
            .update(crc_token)
            .digest('base64');
        res.status(200).send({
            response_token: 'sha256=' + hash
        });
    } else {
        res.status(400).send('Error: crc_token missing from request.');
    }
});

function twitterSecureWebhookHandler(req, res) {
    const twitterHeaderHash = req.headers['x-twitter-webhooks-signature'] || '';
    const myHash = crypto
        .createHmac('sha256', twitterConsumerSecret)
        .update(req.rawBody || '')
        .digest('base64');
    const scmCalculatedHash = 'sha256='.concat(myHash);
    if (twitterHeaderHash && scmCalculatedHash) {
        try {
            const scmBuf = Buffer.from(scmCalculatedHash);
            const twitterBuf = Buffer.from(twitterHeaderHash);
            crypto.timingSafeEqual(scmBuf, twitterBuf);
            res.send('200 OK');
            directMessagingActionHandler.parseTwitterWebhookEvent(req.body);
        } catch (err) {
            logger.error('WRONG_SIGNATURE: Unauthorized access to twitter webhook');
            res.status(401).send('ERROR: Unauthorized access');
        }
    } else {
        res.status(401).send('ERROR: Unauthorized access');
        logger.error('MISSING_SIGNATURE: Unauthorized access to twitter webhook');
    }
}

function twitterWebhookHandler(req, res) {
    res.send('200 OK');
    directMessagingActionHandler.parseTwitterWebhookEvent(req.body);
}

if (SECURE_TWITTER_WEBHOOK && SECURE_TWITTER_WEBHOOK == 'false') {
    logger.warn('Using an unsecured twitter webhook');
    router.post('/webhook/twitter', twitterWebhookHandler);
} else {
    logger.info('Using secure twitter webhook');
    router.post('/webhook/twitter', twitterSecureWebhookHandler);
}

module.exports = router;
