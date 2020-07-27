/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const request = require('request-promise');

const host = 'http://localhost:3000';
// eslint-disable-next-line
const authToken = 'BEARERTOKENBEARERTOKENBEARERTOKENBEARERTOKENBEARERTOKENBEARERTOKENBEARERTOKENBEARERTOKEN';

let options = {
    headers: {
        'Authorization': 'Bearer ' + authToken
    },
    json: true
};

let widgetOpts = Object.assign({}, options);

widgetOpts.uri = host +
        '/campaign-results/graph/widget?campaignId=6c407364bebe58c406dc2190fe0e1fe9&_=15785611652429';

async function makeTooManyRequests() {
    try {
        await request.get(widgetOpts);
        console.log('Request one!');
        await request.get(widgetOpts);
        console.log('Request two!');
        await request.get(widgetOpts);
        console.log('Request three!');
        await request.get(widgetOpts);
        console.log('Request four!');
        await request.get(widgetOpts);
        console.log('Request five!');
        await request.get(widgetOpts);
        console.log('All goooood!');
    } catch (err) {
        console.error('ERROR: Too many requests!');
    }
}

makeTooManyRequests();
