'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Database names
const DATABASE_CAMPAIGNS = 'campaigns';
const DATABASE_RESPONSES = 'responses';
const DATABASE_PROFILES = 'profiles';
const DATABASE_TWEETS = 'tweets';

// Selectors
const getSelector = function(id, fieldsToInclude) {
    // If `id` is passed in, return that one document, else get all
    var selectorId = id ? { _id: id } : { _id: { $gt: 0 }};
    let selectorObj = { selector: selectorId };

    if (fieldsToInclude && fieldsToInclude.length) {
        var basicFields = ['_id', '_rev'];
        var allFields = fieldsToInclude.concat(basicFields);
        selectorObj['fields'] = allFields;
    }
    return selectorObj;
};

/**
In order to get all non-design documents, we set a requirement that each doc must have a required field
*/
const getSelectorWithRequired = function(id, fieldsToInclude, required, sort, order) {
    // If `id` is passed in, return that one document, else get all
    var selectorId = id ? { _id: id } : { _id: { $gt: 0 }, $not: { [required]: null }};
    var response = { selector: selectorId };

    // If fieldsToInclude is null, return all fields
    if (fieldsToInclude !== null) {
        var basicFields = ['_id', '_rev'];
        var allFields = fieldsToInclude.concat(basicFields);

        response.fields = allFields;
    }

    if (sort) {
        var sortObj = {};
        sortObj[sort] = order;
        response.sort = [sortObj];
    }

    return response;
};

const getProfile = function(sessionId) {
    return {
        selector: { sessionId: sessionId },
        fields: [
            '_id',
            '_rev',
            'socialMediaUserId',
            'sessionId',
            'age',
            'gender',
            'locationName',
            'locationData',
            'campaigns'
        ]
    };
};

const getResponsesWithCampaignId = function(campaignId) {
    return { selector: { campaignId: campaignId }, fields: ['_id', '_rev', 'campaignId']};
};

const getFullResponsesWithCampaignId = function(campaignId) {
    return {
        selector: { campaignId: campaignId },
        fields: [
            'campaignId',
            'sessionId',
            'rawMessage',
            'location',
            'timestamp',
            'dialogNode',
            'nlu',
            'language',
            'isUnknownResponse',
            'recognisedPredefinedAnswer'
        ]
    };
};

const getResponsesSentimentWithCampaignId = function(campaignId) {
    return {
        selector: { campaignId: campaignId },
        fields: [
            'campaignId',
            'nlu.sentiment',
            'dialogNode',
            'isUnknownResponse'
        ]
    };
};

const getNluFieldForWidgetByCampaignId = function(campaignId) {
    return {
        selector: { campaignId: campaignId },
        fields: [
            'nlu'
        ]
    };
};

const campaignProfilesWhoStartedByCampaignId = function(campaignId) {
    var key = 'campaigns.' + campaignId;
    return {
        selector: {
            [key]: { '$gt': '0' }
        },
        fields: ['age', 'gender', 'locationName', 'locationData', 'campaigns']
    };
};

const campaignProfileIdsByCampaignId = function(campaignId) {
    var key = 'campaigns.' + campaignId;
    return {
        selector: {
            [key]: { '$gt': '0' }
        },
        fields: ['_id', '_rev']
    };
};

const campaignWithTweetId = function(tweetId) {
    return {
        selector: { 'twitter_initial_tweet_id': tweetId },
        fields: ['_id', 'name', 'language', 'watson_workspace_id', 'status', 'picker_intent']};
};

const campaignWithHashtag = function(hashtag) {
    return { selector: { 'twitter_hashtag': hashtag }, fields: ['_id', 'name', 'watson_workspace_id', 'picker_intent']};
};

const tweetsWithCampaignId = function(campaignId) {
    return { selector: { 'campaignId': campaignId }};
};

const runningCampaignsList = function() {
    return {
        selector: { 'status': 'Running' },
        fields: [
            '_id',
            'name',
            'status',
            'language',
            'description',
            'picker_intent',
            'watson_workspace_id'
        ]};
};

module.exports = {
    DATABASE_CAMPAIGNS,
    DATABASE_RESPONSES,
    DATABASE_PROFILES,
    DATABASE_TWEETS,
    getSelector,
    getSelectorWithRequired,
    getProfile,
    campaignProfilesWhoStartedByCampaignId,
    campaignProfileIdsByCampaignId,
    getResponsesSentimentWithCampaignId,
    getNluFieldForWidgetByCampaignId,
    campaignWithHashtag,
    campaignWithTweetId,
    runningCampaignsList,
    tweetsWithCampaignId,
    getResponsesWithCampaignId,
    getFullResponsesWithCampaignId
};
