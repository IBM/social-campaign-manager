/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */
require('dotenv').config();

const ngrok = require('ngrok');
const request = require('request-promise');

/*
* Configuration variables:
* - CLOUD_BASE_URL: The url to which Twitter will send it's webhook requests
* - TWITTER_APP_ENVIRONMENT: Your Twitter app environment from https://developer.twitter.com/apps
*/
const CLOUD_BASE_URL = process.env.CLOUD_BASE_URL;
const TWITTER_APP_ENVIRONMENT = process.env.TWITTER_APP_ENVIRONMENT;
const twitterApiUrl = 'https://api.twitter.com/1.1/account_activity/all/' + TWITTER_APP_ENVIRONMENT;

let options = {
    oauth: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        token: process.env.TWITTER_ACCESS_TOKEN_KEY,
        token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    }
};

const PORT = 3000;

async function deleteExistingWebhook() {

    options.url = twitterApiUrl + '/webhooks.json';

    try {
        const existing = await request.get(options);
        const webhook_id = JSON.parse(existing)[0].id;
        console.log('Deleting webhook config:', webhook_id);

        options.url = twitterApiUrl + '/webhooks/' + webhook_id + '.json';
        options.resolveWithFullResponse = true;
        const deleteHooks = await request.delete(options);
        if (deleteHooks.statusCode == 204) {
            console.log('Webhook config deleted.');
        }
    } catch (err) {
        console.log('HTTP response code:', err.statusCode);
        console.log('Error deleting webhook config.');
    }
}

async function createWebhook(ngrokUrl) {
    options.url = twitterApiUrl + '/webhooks.json';
    options.headers = { 'Content-type': 'application/x-www-form-urlencoded' };
    options.form = {
        url: ngrokUrl + '/webhook/twitter'
    };
    options.resolveWithFullResponse = false;

    try {
        await request.post(options);
        console.log('Webhook created.');
    } catch (err) {
        console.log('Error creating Twitter webhook. Is the application running?');
    }
}

async function addSubscription() {
    options.url = twitterApiUrl + '/subscriptions.json';
    options.resolveWithFullResponse = true;

    try {
        const response = await request.post(options);
        if (response.statusCode == 204) {
            console.log('Subscription added.');
        }
    } catch (errorResponse) {
        console.log('Subscription was not able to be added.');
        console.log('- Verify environment name.');
        console.log('- Verify "Read, Write and Access direct messages" is enabled on apps.twitter.com.');
        console.log('Full error message below:');
        console.log(errorResponse.error);
    }
}

async function getNgrokUrl() {
    const url = await ngrok.connect(PORT);
    console.log('ngrok url:', url);
    return url;
}

async function startTunnel() {
    await deleteExistingWebhook();
    let url;
    if (CLOUD_BASE_URL) {
        url = CLOUD_BASE_URL;
    } else {
        url = await getNgrokUrl();
    }
    await createWebhook(url);
    await addSubscription();
}

startTunnel();
