/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const Twitter = require('twitter-lite'),
    fetch = require('node-fetch'),
    { randomInRange } = require('./utils-service'),
    logger = require('../utils/logger')('twitterService');

const MOCK_TWITTER_RESPONSE_TIMEOUT = process.env.MOCK_TWITTER_RESPONSE_TIMEOUT || 1000;

class TwitterService {
    constructor() {
        const MOCK_TWITTER_SERVICE = process.env.MOCK_TWITTER_SERVICE;
        if (MOCK_TWITTER_SERVICE && MOCK_TWITTER_SERVICE === 'true') {
            logger.debug('Using a mock Twitter service');
            this.initMockTwitterService();
        } else {
            logger.debug('Using Twitter service');
            this.initTwitterService();
        }
    }

    initTwitterService() {
        const consumer_key = process.env.TWITTER_CONSUMER_KEY;
        const consumer_secret = process.env.TWITTER_CONSUMER_SECRET;
        const access_token_key = process.env.TWITTER_ACCESS_TOKEN_KEY;
        const access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

        if (consumer_key && consumer_secret && access_token_key && access_token_secret) {
            try {
                this.client = new Twitter({
                    consumer_key: consumer_key,
                    consumer_secret: consumer_secret,
                    access_token_key: access_token_key,
                    access_token_secret: access_token_secret
                });
            } catch (err) {
                logger.error('Error setting up Twitter service', err);
                throw new Error('Error setting up Twitter service.');
            }
        } else {
            logger.warn('Missing Twitter ENV variables. Twitter functionality will not work.');
        }
    }

    initMockTwitterService() {
        logger.info('Using Mock twitter service TIMEOUT: ', MOCK_TWITTER_RESPONSE_TIMEOUT);
        this.client = new MockTwitter();
    }

    async replyToTweet(screenName, tweetId, message) {
        logger.debug('Replying to tweet.', {
            tweetId: tweetId
        });
        let params = {
            status: '@' + screenName + ' ' + message,
            in_reply_to_status_id: tweetId
        };
        try {
            const twitterResp = await this.client.post('statuses/update', null, params);
            return twitterResp.id_str;
        } catch (err) {
            logger.error('Failed to reply to tweet', err);
            throw new Error('Failed to reply to tweet', err);
        }
    }

    async replyToDirectMessage(recipientId, dm_response_text, dm_response_context) {
        if (!dm_response_text || typeof dm_response_text !== 'string') {
            logger.error('DM needs to be a string and text cannot be blank.');
            throw new Error('DM needs to be a string and cannot be blank.');
        }

        let quickReplyObj = {};
        if (dm_response_context) {
            quickReplyObj = this.getQuickReplyOptions(dm_response_context);
        }

        // Send back response
        let msg_create = {
            event: {
                type: 'message_create',
                message_create: {
                    target: {
                        recipient_id: recipientId
                    },
                    message_data: {
                        text: dm_response_text,
                        ...quickReplyObj
                    }
                }
            }
        };

        try {
            logger.info('Sending message to Twitter.');
            await this.client.post('direct_messages/events/new', msg_create, null);
            logger.info('Direct message response sent to Twitter.');
        } catch (err) {
            if (err.errors && err.errors[0] && err.errors[0].code === 226) {
                logger.error('Twitter thinks this is an automated response. Filler message in a moment.', err.errors);
                this.sendDmReplyWithRandomTimeout(msg_create);
            } else {
                logger.error('Unspecified Twitter error', err.errors);
                throw err;
            }
        }
    }

    async sendDmReplyWithRandomTimeout(msg_create) {
        const randTimeout = randomInRange(60, 65) * 1000;

        const fillerMessage = {
            event: {
                type: 'message_create',
                message_create: {
                    target: {
                        recipient_id: msg_create.event.message_create.target.recipient_id
                    },
                    message_data: {
                        text: 'Hmm, something has gone wrong. I need a moment to cool down my systems. '
                            + 'I will try to respond back to you in a minute.'
                    }
                }
            }
        };

        await this.client.post('direct_messages/events/new', fillerMessage, null);

        setTimeout(async () => {
            try {
                await this.client.post('direct_messages/events/new', msg_create, null);
                logger.warn('Direct message response sent on retry.');
            } catch (err) {
                logger.error('Twitter thinks this message is automated. Will not continue.', err);
                throw new Error('Twitter thinks this message is automated. Wont continue', err);
            }
        }, randTimeout);
    }

    sendTypingIndicator(twitterUserIdNumber) {
        logger.info(`Sending Typing Indicator to ${twitterUserIdNumber}`);

        /*
         * TODO: This is a hack, the library twitter library crashes when twitter returns nothing for the body as it is
         * trying to convert it to json, Using library functions to make sure correct auth headers have been appended to
         * request.
         */
        const { requestData, headers } = this.client._makeRequest('POST', 'direct_messages/indicate_typing', {
            recipient_id: twitterUserIdNumber
        });

        fetch(requestData.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...headers
            }
        }).catch(err => logger.error('Could not send typing indicator', err));
    }

    getQuickReplyOptions(context) {
        logger.debug('Current conversation context', context);
        let quickReplyObj = {
            quick_reply: {
                type: 'options',
                options: []
            }
        };

        if (context.quick_reply_options && context.quick_reply_options.length) {
            quickReplyObj.quick_reply.options = context.quick_reply_options.map(option => ({
                label: option && option.length ? option.substr(0, 34) : ''
            }));
        } else {
            quickReplyObj = null;
        }

        return quickReplyObj;
    }

    async postTweet(message) {
        let params = {
            status: message.replace(/[^a-zA-Z\-.#,_!?\d\s]/g, '')
        };

        try {
            const twitterResp = await this.client.post('statuses/update', null, params);
            logger.info('Posted Tweet.');
            logger.debug('Twitter response', twitterResp);
            return twitterResp;
        } catch (error) {
            logger.error('Failed to post: ', JSON.stringify(error));
            throw new Error('Failed to post tweet: ' + JSON.stringify(error));
        }
    }
}

class MockTwitter {

    constructor() {}

    async get(resource, body, params) {
        return this._makeRequest('GET', resource, null, params);
    }

    async post(resource, body, params) {
        return this._makeRequest('POST', resource, body, params);
    }

    _makeRequest(method, resource, body, params) {
        return new Promise(resolve => {
            setTimeout(()=> {
                logger.info('[PERFORMANCE] MOCK REQUEST TO TWITTER', {
                    method: method,
                    resource: resource,
                    body: body,
                    params: params
                });
                resolve({ id_str: 'MOCK_id_str' });
            }, MOCK_TWITTER_RESPONSE_TIMEOUT);
        });
    }
}

module.exports = TwitterService;
