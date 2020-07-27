/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const WebService = require('../server/utils/web-service'),
    WS = new WebService(),
    WSR = require('../server/utils/web-service-response'),
    CampaignsService = require('../server/services/campaigns-service'),
    ResponseConstants = require('./response-constants'),
    express = require('express'),
    router = express.Router();

let campaignsService;

router.use((req, res, next) => {
    campaignsService = new CampaignsService(req.providerInstances.cloudant);
    next();
});

/**
 * GET with optional `campaignId` param.
 * With param, will search for that id.
 * Without param, will return all.
 */
router.get('/campaign', async (req, res) => {
    var paramLocation = WS.paramLocation(req);

    // If there is no `campaignId` get a few fields for every campaign, else get all fields for 1 campaign
    var fields = null;
    if (!paramLocation.campaignId) {
        fields = ['created', 'name', 'metadata', 'description', 'status'];
    }

    try {
        const campaignResp = await campaignsService.getCampaignById(
            paramLocation.campaignId,
            fields
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, campaignResp)
        );
    } catch (err) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: err })
        );
    }
});

/**
 * POST with required `campaign` prop.
 */
router.post('/campaign-draft', async (req, res) => {
    const requiredParams = ['campaign'];
    const paramLocation = WS.paramLocation(req);
    const requiredParamsValid = WS.validateQueryParams(
        requiredParams,
        req,
        res
    );

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const campaignData = paramLocation.campaign;
        const campaign = await campaignsService.createDraftCampaign(
            campaignData
        );
        res.status(201).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, campaign)
        );
    } catch (error) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

/**
 * PUT save campaign to database without Watson
 *   - required `campaign` prop.
 */
router.put('/campaign/save', async (req, res) => {
    const requiredParams = ['campaign'];
    const paramLocation = WS.paramLocation(req);
    const requiredParamsValid = WS.validateQueryParams(
        requiredParams,
        req,
        res
    );

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const campaignData = paramLocation.campaign;
        const campaign = await campaignsService.saveExistingCampaignToDatabase(
            campaignData
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, campaign)
        );
    } catch (error) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

/**
 * POST Publish campaign. Create / Update Watson Workspace. Tweet out initial tweet (if necessary).
 *   - required `campaign` prop.
 */
router.post('/campaign/publish', async (req, res) => {
    const requiredParams = ['campaign'];
    const paramLocation = WS.paramLocation(req);
    const requiredParamsValid = WS.validateQueryParams(
        requiredParams,
        req,
        res
    );

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const campaignData = paramLocation.campaign;
        const campaign = await campaignsService.publishCampaign(
            campaignData
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, campaign)
        );
    } catch (error) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

/**
 * POST Tweet out initial tweet. Separated due to Twitter SPAM filters being very picky
 *   - required `campaign_id`, `twitter_initial_tweet`, `twitter_hashtag` props.
 */
router.post('/campaign/tweet', async (req, res) => {
    const requiredParams = ['campaign_id', 'twitter_initial_tweet', 'twitter_hashtag'];
    const paramLocation = WS.paramLocation(req);
    const requiredParamsValid = WS.validateQueryParams(
        requiredParams,
        req,
        res
    );

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const campaign_id = paramLocation.campaign_id;
        const twitter_initial_tweet = paramLocation.twitter_initial_tweet;
        const twitter_hashtag = paramLocation.twitter_hashtag;

        const campaign = await campaignsService.tweetOutInitialTweet(
            campaign_id,
            twitter_initial_tweet,
            twitter_hashtag
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, campaign)
        );
    } catch (error) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

/**
 * DELETE with required `campaignId`, `campaignRev` props.
 */
router.delete('/campaign', async (req, res) => {
    var requiredParams = ['campaignId'];
    var paramLocation = WS.paramLocation(req);
    var requiredParamsValid = WS.validateQueryParams(requiredParams, req, res);

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        await campaignsService.validateCampaignId(paramLocation.campaignId);
        await campaignsService.deleteCampaignData(paramLocation.campaignId);
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, null)
        );
    } catch (error) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

/**
 * DELETE with required `campaignId`, `campaignRev` props.
 */
router.delete('/campaign-responses', async (req, res) => {
    var requiredParams = ['campaignId'];
    var paramLocation = WS.paramLocation(req);
    var requiredParamsValid = WS.validateQueryParams(requiredParams, req, res);

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        await campaignsService.validateCampaignId(paramLocation.campaignId);
        await campaignsService.deleteCampaignResponses(paramLocation.campaignId);
        await campaignsService.deleteParticipantsByCampaignId(paramLocation.campaignId);
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, null)
        );
    } catch (error) {
        res.status(400).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

router.get('/campaign-participants', async (req, res) => {
    var requiredParams = ['campaignId'];
    var paramLocation = WS.paramLocation(req);
    var requiredParamsValid = WS.validateQueryParams(requiredParams, req, res);

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const response = await campaignsService.fetchCampaignParticipantsByCampaignId(
            paramLocation.campaignId
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, response)
        );
    } catch (err) {
        res.status(500).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: err })
        );
    }
});

router.get('/campaign-responses', async (req, res) => {
    var requiredParams = ['campaignId'];
    var paramLocation = WS.paramLocation(req);
    var requiredParamsValid = WS.validateQueryParams(requiredParams, req, res);

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const response = await campaignsService.fetchCampaignResponsesByCampaignId(
            paramLocation.campaignId
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, response)
        );
    } catch (err) {
        res.status(500).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: err })
        );
    }
});

router.get('/campaign-tweets', async (req, res) => {
    var requiredParams = ['campaignId'];
    var paramLocation = WS.paramLocation(req);
    var requiredParamsValid = WS.validateQueryParams(requiredParams, req, res);

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const response = await campaignsService.fetchCampaignTweetsByCampaignId(
            paramLocation.campaignId
        );
        res.status(200).json(
            WSR.responseWithConstant(ResponseConstants.SUCCESS, response)
        );
    } catch (err) {
        res.status(500).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: err })
        );
    }
});

/**
 *  Consolidated graphs for IBM Widget at OpenVA Dashboard
 */
router.get('/campaign-results/graph/widget', async (req, res) => {
    var requiredParams = ['campaignId'];
    var paramLocation = WS.paramLocation(req);
    var requiredParamsValid = WS.validateQueryParams(requiredParams, req, res);

    // Default response will be sent by `validateRequiredURLParams`
    if (!requiredParamsValid) {
        return;
    }

    try {
        const openVaGraphModel = await campaignsService.fetchWidgetGraphData(
            paramLocation.campaignId
        );
        res.status(200).json(
            WSR.responseWithConstant(
                ResponseConstants.SUCCESS,
                openVaGraphModel
            )
        );
    } catch (error) {
        res.status(500).json(
            WSR.responseWithConstant(ResponseConstants.ERROR, { error: error })
        );
    }
});

module.exports = router;
