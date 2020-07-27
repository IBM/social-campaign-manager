/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const WebService = require('../server/utils/web-service'),
    WS = new WebService(),
    WSR = require('../server/utils/web-service-response'),
    ThrottleService = require('../server/services/throttle-service'),
    ResponseConstants = require('./response-constants'),
    express = require('express'),
    router = express.Router();

let throttleService;

router.use((req, res, next) => {
    throttleService = new ThrottleService(req.providerInstances.redis.client);
    next();
});

/**
 * GET the currently set Throttle Factor
 */
router.get('/throttle', async (req, res) => {
    try {
        const throttleResponse = await throttleService.getConfigKeys();
        res.status(200).json(WSR.responseWithConstant(ResponseConstants.SUCCESS, throttleResponse));
    } catch (err) {
        res.status(400).json(WSR.responseWithConstant(ResponseConstants.ERROR, { error: err }));
    }
});

/**
 * POST with required `throttleKey` and 'throttleValue' props.
 * Set any throttling key to a set value
 */
router.post('/throttle', async (req, res) => {
    const paramLocation = WS.paramLocation(req);

    try {
        let result = {};
        if (!paramLocation.throttleKey &&
            !paramLocation.throttleValue && paramLocation.throttleValue !== 0) {
            throw new Error('Invalid Keys Requested');
        } else {
            const throttleKey = paramLocation.throttleKey;
            const throttleValue = paramLocation.throttleValue;

            await throttleService.set(throttleKey, throttleValue);
            result[throttleKey] = throttleValue;
        }

        res.status(200).json(WSR.responseWithConstant(ResponseConstants.SUCCESS, result));
    } catch (error) {
        res.status(400).json(WSR.responseWithConstant(ResponseConstants.ERROR, { error: error }));
    }
});

router.delete('/throttle', async (req, res) => {
    const paramLocation = WS.paramLocation(req);

    try {
        let result = {};
        if (paramLocation.throttleKey && paramLocation.throttleKey.length) {
            const throttleKey = paramLocation.throttleKey;
            await throttleService.delete(throttleKey);
            result = `Deleted redis key ${throttleKey}`;
        } else {
            throw new Error('Invalid Keys Requested');
        }

        res.status(200).json(WSR.responseWithConstant(ResponseConstants.SUCCESS, result));
    } catch (error) {
        res.status(400).json(WSR.responseWithConstant(ResponseConstants.ERROR, { error: error }));
    }
});

module.exports = router;
