/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const express = require('express'),
    router = express.Router(),
    logger = require('../server/utils/logger')('slackRouter');

const { createEventAdapter } = require('@slack/events-api');
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

if (SLACK_SIGNING_SECRET) {
    const slackEvents = createEventAdapter(SLACK_SIGNING_SECRET);

    let directMessagingActionHandler;

    router.use((req, res, next) => {
        directMessagingActionHandler = req.directMessagingActionHandler;
        next();
    });

    router.use('/webhook/slack/actions', (req, res) => {
        try {
            const payloadJson = JSON.parse(req.body['payload']);
            directMessagingActionHandler.parseSlackActionEvent(payloadJson);
            res.status(200).send('OK');
        } catch (err) {
            logger.error('Bad action request', err);
            res.status(400).send('Bad request');
        }
    });

    router.use('/webhook/slack', slackEvents.expressMiddleware());

    slackEvents.on('message', (event) => {
        logger.debug('[SlackRouter] Received a slack message event');
        directMessagingActionHandler.parseSlackMessageEvent(event);
    });

    slackEvents.on('app_home_opened', async (event) => {
        logger.info('[SlackRouter] Received an app_home_opened event');
        directMessagingActionHandler.parseSlackOpenAppHomeEvent(event);
    });

    slackEvents.on('app_mention', async (event) => {
        logger.info('[SlackRouter] Received an app_mention event');
        directMessagingActionHandler.parseSlackMentionEvent(event);
    });
}
module.exports = router;
