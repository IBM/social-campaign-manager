/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const logger = require('../utils/logger')('CampaignService'),
    CloudantConstants = require('../data-providers/cloudant/cloudant-constants'),
    WatsonDialogService = require('./watson-dialog-service'),
    WatsonWorkspaceService = require('./watson-workspace-service'),
    TwitterService = require('./twitter-service'),
    Intent = require('../models/conversation-intent');

const watsonDialogService = new WatsonDialogService();
const watsonWorkspaceService = new WatsonWorkspaceService();
const twitterService = new TwitterService();

class CampaignsService {
    constructor(cloudant) {
        this.cloudant = cloudant;
    }

    async createOrUpdatePickerIntent(campaignWorkspace) {
        try {
            const examplesList = campaignWorkspace.picker_intent_examples.split(',');
            const campaignIntent = new Intent({
                intent: campaignWorkspace.picker_intent,
                description: campaignWorkspace.description,
                examples: examplesList
            });

            try {
                const intentExists = await watsonWorkspaceService.getIntentFromWorkspacePicker(campaignIntent);
                logger.info('Intent already exists in Workspace Picker', intentExists);
                if (intentExists) {
                    watsonWorkspaceService.updateIntentInWorkspacePicker(campaignIntent);
                }
            } catch (err) {
                watsonWorkspaceService.createIntentInWorkspacePicker(campaignIntent);
            }
        } catch (err) {
            logger.error('Error creating new picker intent', err);
            throw err;
        }
    }

    async createDraftCampaign(campaign) {
        try {
            const cloudantDoc = await this.createCampaignDraftInDatabase(campaign);
            logger.debug('Created campaign draft', cloudantDoc);
            return cloudantDoc;
        } catch (err) {
            logger.error('Error creating campaign draft', err);
            throw new Error('Error creating campaign', err);
        }
    }

    async publishWatsonDialog(campaignDoc) {
        if (campaignDoc.watson_workspace_id && campaignDoc.watson_workspace_id.length) {
            const watsonResult = await watsonWorkspaceService.updateWorkspace(campaignDoc.watson_workspace);
            campaignDoc.watson_workspace_id = watsonResult.workspace_id;
        } else {
            const watsonResult = await watsonWorkspaceService.createWorkspace(campaignDoc.watson_workspace);
            campaignDoc.watson_workspace_id = watsonResult.workspace_id;
        }
    }

    async publishCampaign(campaignDoc) {
        try {
            campaignDoc.watson_workspace = await watsonDialogService.generateWatsonWorkspace(campaignDoc);
            await this.createOrUpdatePickerIntent(campaignDoc);
            await this.publishWatsonDialog(campaignDoc);
            campaignDoc.status = 'Running';
            campaignDoc.published = new Date().toISOString();
            campaignDoc.published_by = 'authenticated-user-id';
            const dbDoc = await this.saveExistingCampaignToDatabase(campaignDoc);
            return dbDoc;
        } catch (err) {
            logger.error('Error publishing campaign', err);
            throw new Error('Error publishing campaign', err);
        }
    }

    async tweetOutInitialTweet(campaignId, twitter_initial_tweet, twitter_hashtag) {
        try {
            const campaignDbRes = await this.getCampaignById(campaignId);
            if (!campaignDbRes.length)
                throw new Error('Campaign does not exist in database.');

            const campaignDoc = campaignDbRes[0];

            if (!campaignDoc.published.length || !campaignDoc.twitter_initial_tweet_id.length) {
                logger.info('Sending initial tweet.', twitter_initial_tweet);
                logger.info('Related hashtag', twitter_hashtag);
                const tweetMsg = `${twitter_initial_tweet} #${twitter_hashtag}`;
                const tweetResponse = await twitterService.postTweet(tweetMsg);
                const twUser = tweetResponse.user.screen_name;
                campaignDoc.twitter_hashtag = twitter_hashtag;
                campaignDoc.twitter_initial_tweet = twitter_initial_tweet;
                campaignDoc.twitter_initial_tweet_id = tweetResponse.id_str;
                campaignDoc.twitter_initial_tweet_link = `https://twitter.com/${twUser}/status/${tweetResponse.id_str}`;
                this.saveExistingCampaignToDatabase(campaignDoc);
            } else {
                throw new Error('Campaign cannot post tweet. Not published or already tweeted.');
            }
        } catch (err) {
            logger.error('Tweet error: Campaign tweet could not be posted. ', err);
            throw new Error('Tweet error: Campaign tweet could not be posted!');
        }
    }

    async saveExistingCampaignToDatabase(campaignDoc) {
        try {
            if (campaignDoc.status === 'Stopped' && campaignDoc.watson_workspace_id) {
                await watsonWorkspaceService.deletePickerIntentFromWorkspacePicker(campaignDoc.picker_intent);
                await watsonWorkspaceService.deleteWorkspace(campaignDoc.watson_workspace_id);
                campaignDoc.published = '';
                campaignDoc.published_by = '';
                campaignDoc.watson_workspace_id = '';
                campaignDoc.twitter_initial_tweet_id = '';
                campaignDoc.twitter_initial_tweet_link = '';
            }
            campaignDoc.updated = new Date().toISOString();
            campaignDoc.updated_by = 'authenticated-user-id';
            return this.cloudant.update(CloudantConstants.DATABASE_CAMPAIGNS, campaignDoc);
        } catch (err) {
            logger.error('Error updating campaign', err);
            throw err;
        }
    }

    async createCampaignDraftInDatabase(campaignDoc) {
        campaignDoc.status = 'Draft';
        campaignDoc.questions = [];
        campaignDoc.picker_intent = '';
        campaignDoc.picker_intent_examples = [];
        campaignDoc.twitter_initial_tweet = '';
        campaignDoc.twitter_initial_tweet_id = '';
        campaignDoc.twitter_hashtag = '';
        campaignDoc.chat_introduction = '';
        campaignDoc.language = 'en';
        campaignDoc.watson_workspace_id = '';
        campaignDoc.watson_workspace = '';
        campaignDoc.created = new Date().toISOString();
        campaignDoc.created_by = 'authenticated-user-id';
        campaignDoc.updated = new Date().toISOString();
        campaignDoc.updated_by = 'authenticated-user-id';
        campaignDoc.published = '';
        campaignDoc.published_by = '';
        return this.cloudant.create(CloudantConstants.DATABASE_CAMPAIGNS, campaignDoc);
    }

    validateCampaignId(str) {
        var validId = /[^a-zA-Z0-9]/g;
        if (str.match(validId)) {
            throw 'Invalid campaign id supplied';
        }
    }

    async deleteCampaignData(campaignId) {
        try {
            const campaignDoc = await this.cloudant.read(
                CloudantConstants.DATABASE_CAMPAIGNS,
                CloudantConstants.getSelector(campaignId, [
                    'name',
                    'workspace_id',
                    'watson_workspace_id',
                    'picker_intent',
                    'updated'
                ])
            );
            if (campaignDoc && campaignDoc.length) {
                if (campaignDoc[0].watson_workspace_id && campaignDoc[0].watson_workspace_id.length) {
                    await watsonWorkspaceService.deleteWorkspace(
                        campaignDoc[0].watson_workspace_id,
                        campaignDoc[0].picker_intent
                    );
                }
                await this.cloudant.delete(CloudantConstants.DATABASE_CAMPAIGNS, campaignId, campaignDoc[0]._rev);
                await this.deleteCampaignResponses(campaignId);
                await this.deleteParticipantsByCampaignId(campaignId);
            } else {
                logger.error('Campaign id ' + campaignId + ' not found');
                throw new Error('Campaign not found');
            }
        } catch (err) {
            logger.error('Error deleting campaign data', err);
            throw new Error(err);
        }
    }

    async deleteCampaignResponses(campaignId) {
        try {
            let responsesDocs = await this.cloudant.read(
                CloudantConstants.DATABASE_RESPONSES,
                CloudantConstants.getResponsesWithCampaignId(campaignId)
            );
            if (responsesDocs && responsesDocs.length) {
                for (let doc of responsesDocs) {
                    doc._deleted = true;
                }
                await this.cloudant.bulk(CloudantConstants.DATABASE_RESPONSES, responsesDocs);
            } else {
                logger.warn('No responses with campaignId ' + campaignId + ' found');
            }
        } catch (err) {
            logger.error('Error deleting campaign responses', err);
            throw new Error(err);
        }
    }

    async deleteParticipantsByCampaignId(campaignId) {
        logger.info('Deleting campaign participants for campaign id:', campaignId);
        try {
            let participantsDocs = await this.cloudant.read(
                CloudantConstants.DATABASE_PROFILES,
                CloudantConstants.campaignProfileIdsByCampaignId(campaignId)
            );

            if (participantsDocs && participantsDocs.length) {
                for (let doc of participantsDocs) {
                    doc._deleted = true;
                }

                await this.cloudant.bulk(CloudantConstants.DATABASE_PROFILES, participantsDocs);
            } else {
                logger.warn('No participants to delete with campaignId ' + campaignId + ' found');
            }
        } catch (err) {
            logger.error('Error deleting participant responses', err);
            throw new Error(err);
        }
    }

    assignResultsToObject(obj, cloudantResult) {
        if (cloudantResult && cloudantResult.rows && cloudantResult.rows.length) {
            return Object.assign(obj, cloudantResult.rows[0].value);
        }
    }

    async fetchCampaignResponsesByCampaignId(campaignId) {
        logger.info('Fetching responses for campaign:', campaignId);
        const responses = await this.cloudant.read(
            CloudantConstants.DATABASE_RESPONSES,
            CloudantConstants.getFullResponsesWithCampaignId(campaignId)
        );
        logger.debug('Found responses', responses);
        return responses;
    }

    async fetchCampaignParticipantsByCampaignId(campaignId) {
        logger.info('Fetching participants for campaign:', campaignId);
        const participants = await this.cloudant.read(
            CloudantConstants.DATABASE_PROFILES,
            CloudantConstants.campaignProfilesWhoStartedByCampaignId(campaignId)
        );
        logger.debug('Found participants', participants);
        return participants;
    }

    async fetchCampaignTweetsByCampaignId(campaignId) {
        logger.info('Fetching tweets for campaign:', campaignId);
        const tweets = await this.cloudant.read(
            CloudantConstants.DATABASE_TWEETS,
            CloudantConstants.tweetsWithCampaignId(campaignId)
        );
        logger.debug('Found tweets', tweets);
        return tweets;
    }

    getCampaignById(campaignId, fields) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_CAMPAIGNS,
            CloudantConstants.getSelector(campaignId, fields)
        );
    }

    getCampaignByInitialTweetId(tweetId) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_CAMPAIGNS,
            CloudantConstants.campaignWithTweetId(tweetId));
    }

    getCampaignByHashtag(hashtag) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_CAMPAIGNS,
            CloudantConstants.campaignWithHashtag(hashtag));
    }

    async handleWidgetDataRetry(err, campaignId) {
        if (err.error === 'too_many_requests') {
            logger.warn('Too many requests. Retrying once.', err);
            setTimeout(async () => {
                return await this.cloudant.readFromView('responses', 'campaign', 'results', {
                    group: true,
                    key: campaignId
                });
            }, 1000);
        } else {
            logger.error('Error getting widget graph data', err);
            throw new Error('Error getting widget graph data', err);
        }
    }

    async getWidgetDataForByCampaignId(campaignId) {
        let widgetCampaignData = {
            overallEmotion: {
                anger: 0,
                angerTotal: 0,
                angerCount: 0,
                disgust: 0,
                disgustTotal: 0,
                disgustCount: 0,
                fear: 0,
                fearTotal: 0,
                fearCount: 0,
                sadness: 0,
                sadnessTotal: 0,
                sadnessCount: 0,
                joy: 0,
                joyTotal: 0,
                joyCount: 0
            },
            overallSentiment: {
                positive: { total: 0 },
                neutral: { total: 0 },
                negative: { total: 0 }
            }
        };

        try {
            const responsesQuery = this.getResponsesDataForWidgetGraphByCampaignId(campaignId);
            const tweetsQuery = this.getTweetsDataForWidgetGraphByCampaignId(campaignId);
            const [responsesData, tweetsData] = await Promise.all([responsesQuery, tweetsQuery]);
            if (responsesData && responsesData.length && tweetsData && tweetsData.length) {
                logger.info('Aggregating responses NLU for campaign', campaignId);
                await this.aggregateResponsesNluForWidget(widgetCampaignData, responsesData);
                await this.aggregateResponsesNluForWidget(widgetCampaignData, tweetsData);
            }
            return widgetCampaignData;
        } catch (err) {
            return this.handleWidgetDataRetry(err, campaignId);
        }
    }

    async aggregateResponsesNluForWidget(widgetCampaignData, graphData) {
        for (let response of graphData) {
            if (response.nlu) {
                this.processResponseSentiment(widgetCampaignData, response.nlu);
                this.addUpResponseEmotions(widgetCampaignData, response.nlu);
            }
        }
        this.averageEmotions(widgetCampaignData);
    }

    processResponseSentiment(widgetCampaignData, nlu) {
        if (nlu.sentiment && nlu.sentiment.document && nlu.sentiment.document.label) {
            widgetCampaignData.overallSentiment[nlu.sentiment.document.label].total += 1;
        }
    }

    addUpResponseEmotions(widgetCampaignData, nlu) {
        if (nlu.emotion && nlu.emotion && nlu.emotion.document && nlu.emotion.document.emotion) {
            Object.keys(nlu.emotion.document.emotion).forEach(emotionKey => {
                widgetCampaignData.overallEmotion[emotionKey + 'Total'] += nlu.emotion.document.emotion[emotionKey];
                widgetCampaignData.overallEmotion[emotionKey + 'Count'] += 1;
            });
        }
    }

    averageEmotions(widgetData) {
        const emotions = ['anger', 'disgust', 'fear', 'sadness', 'joy'];
        emotions.forEach(emotion => {
            widgetData.overallEmotion[emotion]
                = widgetData.overallEmotion[emotion + 'Total'] / widgetData.overallEmotion[emotion + 'Count'];
        });
    }

    async fetchWidgetGraphData(campaignId) {
        const commonOpenVaGraphModel = {
            chartStaticImgUrl: '',
            chartTitle: '',
            chartSubTitle: '',
            xLabel: '',
            yLabel: '',
            valueRange: '',
            timeUnit: '',
            startDate: '',
            endDate: '',
            chartData: {
                xAxisType: 'string',
                yAxisType: 'float',
                xData: [],
                yData: []
            }
        };

        let emotionGraph = Object.assign({}, commonOpenVaGraphModel);
        emotionGraph.chartTitle = 'Overall Emotion';
        emotionGraph.xLabel = 'Emotions';

        let sentimentGraph = Object.assign({}, commonOpenVaGraphModel);
        sentimentGraph.chartTitle = 'Overall Sentiment';
        sentimentGraph.xLabel = 'Sentiment';

        try {
            const response = await this.getWidgetDataForByCampaignId(campaignId);

            emotionGraph.chartData = {
                xAxisType: 'string',
                yAxisType: 'float',
                xData: ['Anger', 'Disgust', 'Fear', 'Sadness', 'Joy'],
                yData: [
                    [{ seriesType: 'bar', label: 'OverallEmotions' }],
                    [
                        response.overallEmotion.anger,
                        response.overallEmotion.disgust,
                        response.overallEmotion.fear,
                        response.overallEmotion.sadness,
                        response.overallEmotion.joy
                    ]
                ]
            };

            sentimentGraph.chartData = {
                xAxisType: 'string',
                yAxisType: 'float',
                xData: ['Positive', 'Negative', 'Neutral'],
                yData: [
                    [{ seriesType: 'pie', label: 'OverallSentiment' }],
                    [
                        response.overallSentiment.positive.total,
                        response.overallSentiment.negative.total,
                        response.overallSentiment.neutral.total
                    ]
                ]
            };

            return {
                emotion: emotionGraph,
                sentiment: sentimentGraph
            };
        } catch (err) {
            logger.error('Error getting sentiment and emotion widget graph data', err);
            throw new Error('Error getting sentiment and emotion widget graph data', err);
        }
    }

    async getResponsesSentimentByCampaignIdFromDb(campaignId) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_RESPONSES,
            CloudantConstants.getResponsesSentimentWithCampaignId(campaignId)
        );
    }

    async getTweetsSentimentByCampaignIdFromDb(campaignId) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_TWEETS,
            CloudantConstants.getResponsesSentimentWithCampaignId(campaignId)
        );
    }

    async getResponsesDataForWidgetGraphByCampaignId(campaignId) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_RESPONSES,
            CloudantConstants.getNluFieldForWidgetByCampaignId(campaignId)
        );
    }

    async getTweetsDataForWidgetGraphByCampaignId(campaignId) {
        return this.cloudant.read(
            CloudantConstants.DATABASE_TWEETS,
            CloudantConstants.getNluFieldForWidgetByCampaignId(campaignId)
        );
    }

    async getSentimentResultsByCampaignId(campaignId) {
        logger.info('Fetching sentiment for campaign:', campaignId);
        try {
            const responsesPromise = this.getResponsesSentimentByCampaignIdFromDb(campaignId);
            const tweetsPromise = this.getTweetsSentimentByCampaignIdFromDb(campaignId);
            const [responses, tweets] = await Promise.all([responsesPromise, tweetsPromise]);

            let totalSentiment = {
                positive: 0,
                neutral: 0,
                negative: 0,
                overallSentiment: 0,
                totalCount: 0
            };

            if (responses.length) {
                logger.debug('Found ' + responses.length + ' responses. Calculating sentiment.');
                this.addUpResponseSentiment(responses, totalSentiment);
            }

            if (tweets.length) {
                logger.debug('Found ' + tweets.length + ' tweets. Calculating sentiment.');
                this.addUpResponseSentiment(tweets, totalSentiment);
            }

            logger.debug('Sentiment results', totalSentiment);
            return {
                positive: totalSentiment.totalCount ? totalSentiment.positive / totalSentiment.totalCount : 0,
                neutral: totalSentiment.totalCount ? totalSentiment.neutral / totalSentiment.totalCount : 0,
                negative: totalSentiment.totalCount ? totalSentiment.negative / totalSentiment.totalCount : 0,
                overallSentiment: totalSentiment.overallSentiment
            };
        } catch (err) {
            logger.error('Error getting responses sentiment', err);
            throw err;
        }
    }

    addUpResponseSentiment(responses, totalSentiment) {
        for (let response of responses) {
            if (response.nlu && response.nlu.sentiment
                && response.nlu.sentiment.document
                && response.nlu.sentiment.document.label) {
                totalSentiment[response.nlu.sentiment.document.label] += 1;
                totalSentiment.totalCount += 1;
                totalSentiment.overallSentiment += response.nlu.sentiment.document.score;
            }
        }
    }
}

module.exports = CampaignsService;
