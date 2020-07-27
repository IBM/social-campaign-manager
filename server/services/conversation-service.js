'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const AssistantV1 = require('ibm-watson/assistant/v1');
const logger = require('../utils/logger')('conversationProvider');
const { randomInRange } = require('./utils-service');
const CloudantConstants = require('../data-providers/cloudant/cloudant-constants');
const Profile = require('../models/profile');

const NluService = require('./nlu-service');
const nluService = new NluService();

const ThrottleService = require('./throttle-service');

const predefinedResponses = require('../models/predefined_responses_en.json');

class ConversationService {
    constructor(cloudant, redis) {
        this.cloudant = cloudant;
        this.redis = redis;

        this.WORKSPACE_PICKER_ID = '';
        this.existingCampaigns = [];

        this.throttleService = new ThrottleService(this.redis);

        try {
            const credentials = JSON.parse(process.env.VCAP_SERVICES).conversation[0].credentials;
            this.client = new AssistantV1({
                iam_apikey: credentials.apiKey,
                version: '2018-07-10',
                url: credentials.url
            });
            this.getAvailableWorkspaces();
        } catch (err) {
            logger.error('Unable to setup Watson Assistant check your `process.env.VCAP_SERVICES`', err);
            throw err;
        }
    }

    async getAllRunningCampaignsList() {
        const allCampaigns = await this.cloudant.read(
            CloudantConstants.DATABASE_CAMPAIGNS,
            CloudantConstants.runningCampaignsList()
        );
        logger.info('Getting a list of all campaigns', allCampaigns);
        this.existingCampaigns = allCampaigns.length ? allCampaigns : [];
        return this.existingCampaigns;
    }

    async getCampaignByPickerIntent(pickerIntent) {
        const campaign = this.existingCampaigns.filter(campaign => {
            return campaign.picker_intent === pickerIntent;
        });
        return campaign[0];
    }

    async getAvailableWorkspaces() {
        try {
            this.client.listWorkspaces(async (err, workspacesList) => {
                if (err) throw err;
                this.setWorkspacePickerId(workspacesList);
            });
        } catch (err) {
            logger.error('Unable to fetch workspaces', err);
            throw 'Unable to fetch workspaces: ';
        }
    }

    setWorkspacePickerId(workspacesList) {
        workspacesList.workspaces.forEach(workspace => {
            if (workspace.name === 'WORKSPACE_PICKER') {
                this.WORKSPACE_PICKER_ID = workspace.workspace_id;
                logger.debug('WORKSPACE PICKER ID:', this.WORKSPACE_PICKER_ID);
            }
        });
    }

    createNewSessionId() {
        const sessionId = Date.now() + '_' + randomInRange(0, 1000);
        logger.info('Created new user session', sessionId);
        return sessionId;
    }

    async getRedisContextByTwitterUserId(redisUserIdKey) {
        try {
            const redisStart = new Date();
            const redisValue = await this.redis.getAsync(redisUserIdKey);
            const redisRead = (new Date() - redisStart);
            logger.info('[Performance] REDIS_READ_CONTEXT in ' + redisRead + ' millis');

            if (redisValue && redisValue.length) {
                const parsedContext = JSON.parse(redisValue);
                logger.debug('Redis context', parsedContext);
                return parsedContext;
            } else {
                const emptyContext = {
                    workspace_id: '',
                    campaign_id: '',
                    session_id: this.createNewSessionId(),
                    language: '',
                    context: {}
                };
                logger.debug('Returning empty redis context', emptyContext);
                return emptyContext;
            }
        } catch (err) {
            logger.error('Error reading from redis', err);
            throw err;
        }
    }

    async clearRedisContext(senderId) {
        const redisValue = await this.redis.getAsync(senderId);

        if (redisValue && redisValue.length) {
            const existingContext = JSON.parse(redisValue);
            logger.debug('Redis context', existingContext);
            const emptyContext = {
                workspace_id: '',
                campaign_id: '',
                session_id: existingContext.sessionId,
                language: '',
                context: {}
            };
            this.saveRedisContextByTwitterUserId(emptyContext, senderId);
        }
    }

    async saveRedisContextByTwitterUserId(redisContext, redisUserIdKey) {
        logger.debug('Saving context to REDIS', { context: redisContext, user: redisUserIdKey });
        redisContext.updated = new Date().toISOString();
        try {
            const redisStart = new Date();
            await this.redis.setAsync(redisUserIdKey, JSON.stringify(redisContext), 'EX', 259200);
            const redisRead = (new Date() - redisStart);
            logger.info('[Performance] REDIS_SAVE_CONTEXT in ' + redisRead + ' millis');
        } catch (err) {
            logger.error('Error saving context to redis', err);
            throw err;
        }
    }

    async presetConversationRedisForCampaign(campaignObj, senderId) {
        const presetContext = {
            workspace_id: campaignObj.watson_workspace_id,
            campaign_id: campaignObj._id,
            language: campaignObj.language,
            session_id: this.createNewSessionId(),
            context: {
                from_public_message: 1
            }
        };
        logger.debug('Presetting REDIS context for campaign', presetContext);
        this.saveRedisContextByTwitterUserId(presetContext, senderId);
    }

    /* If there's a fresh context respond to twitter with a list of available campaigns */
    async getListOfAvailableCampaignChoiceText(availableCampaigns) {
        let campaignsStr = predefinedResponses.chatbot_introduction;
        availableCampaigns.forEach(campaign => {
            if (campaign.status === 'Running') {
                campaignsStr = campaignsStr + ` - ${campaign.name}: ${campaign.description} \n`;
            }
        });

        return campaignsStr;
    }

    getRandomTweetResponse(chatLink) {
        const lengthOfReplies = predefinedResponses.tweet_reply.length;
        return predefinedResponses.tweet_reply[randomInRange(0, lengthOfReplies)]
            .replace('{CHAT_LINK}', chatLink);
    }

    async pickWorkspaceByUserConditions(messageObject, previousContext, twitterSenderId) {
        if (!previousContext.workspace_id) {
            const availableCampaigns = await this.getAllRunningCampaignsList();
            if (availableCampaigns.length === 1) {
                logger.info('Only one campaign to select from. Setting context.');
                const workspaceId = availableCampaigns[0].watson_workspace_id;
                const campaignId = availableCampaigns[0]._id;
                const language = availableCampaigns[0].language;
                messageObject.workspace_id = workspaceId;
                previousContext.workspace_id = workspaceId;
                previousContext.campaign_id = campaignId;
                previousContext.language = language;
                previousContext['context'].from_public_message = 1;
                this.saveRedisContextByTwitterUserId(previousContext, twitterSenderId);
                return null;
            } else {
                logger.info('Setting workspace picker and getting list of available campaigns');
                messageObject.workspace_id = this.WORKSPACE_PICKER_ID;
                previousContext.workspace_id = this.WORKSPACE_PICKER_ID;
                const availableCampaignsList = await this.getListOfAvailableCampaignChoiceText(availableCampaigns);
                this.saveRedisContextByTwitterUserId(previousContext, twitterSenderId);
                return { output: { text: [availableCampaignsList]}};
            }
        } else {
            return null;
        }
    }

    enrichResponseUsingPreviousContext(participantResponse, previousContext) {
        participantResponse.campaignId = previousContext.campaign_id;
        participantResponse.language = previousContext.language;
        participantResponse.sessionId = previousContext.session_id;

        if (previousContext.context.system && previousContext.context.system.dialog_stack
            && previousContext.context.system.dialog_stack.length
            && previousContext.context.system.dialog_stack[0].dialog_node) {
            participantResponse.dialogNode = previousContext.context.system.dialog_stack[0].dialog_node;
        }
    }

    async sendChatMessage(twitterDmObj, participantResponse) {
        try {
            const twitterSenderId = twitterDmObj.sender.senderId;
            let previousContext = await this.getRedisContextByTwitterUserId(twitterSenderId);
            this.enrichResponseUsingPreviousContext(participantResponse, previousContext);

            let messageObject = {
                input: { text: twitterDmObj.text },
                context: previousContext.context,
                workspace_id: previousContext.workspace_id
            };

            const pickerList = await this.pickWorkspaceByUserConditions(messageObject,
                previousContext, twitterSenderId);
            if (pickerList) {
                logger.info('Returning picker list or going directly to campaign.');
                return pickerList;
            }

            // Send message to chosen workspace, with context object
            const watsonResponse = await this.sendMessageToWatson(messageObject);
            const processed = await this.processConversationContextOrReturnPickerCampaign(previousContext,
                watsonResponse, participantResponse);
            await this.saveRedisContextByTwitterUserId(processed.updatedContext, twitterSenderId);
            return processed.watsonResponse;
        } catch (err) {
            logger.error('Error sending or receiving message from Watson', err);
            return {
                output: {
                    text: ['Oops, something went wrong. Please try again.']
                }
            };
        }
    }

    async selectCampaignFromIntent(previousWatsonResponse) {
        const mostLikelyCampaignSelectionIntent = previousWatsonResponse.intents[0].intent;
        logger.debug('Most likely the user selected', mostLikelyCampaignSelectionIntent);
        const selectedCampaign = await this.getCampaignByPickerIntent(mostLikelyCampaignSelectionIntent);
        logger.info('selectedCampaign', selectedCampaign);
        let messageObject = {
            input: { text: '' },
            context: {},
            workspace_id: selectedCampaign.watson_workspace_id
        };

        logger.info(`Selecting campaign: ${selectedCampaign.name}. Resetting context.`);
        const watsonNextResponse = await this.sendMessageToWatson(messageObject);

        return {
            updatedContext: {
                campaign_id: selectedCampaign._id,
                language: selectedCampaign.language,
                workspace_id: selectedCampaign.watson_workspace_id,
                context: watsonNextResponse.context
            },
            watsonResponse: watsonNextResponse
        };
    }

    async processResponseContext(previousContext, watsonResponse, participantResponse) {
        // Handle question responses here
        logger.debug('Answering campaign questions', previousContext);
        logger.debug('New Watson context', watsonResponse.context);
        await this.enrichResponseWithNewContext(participantResponse, watsonResponse);
        // update context
        let updatedContext = previousContext;
        updatedContext.context = watsonResponse.context;
        return {
            updatedContext: updatedContext,
            watsonResponse: watsonResponse
        };
    }

    async processConversationContextOrReturnPickerCampaign(previousContext, watsonResponse,
        participantResponse) {
        logger.debug('Previous context is', previousContext);
        if (
            previousContext.workspace_id === this.WORKSPACE_PICKER_ID &&
            watsonResponse.intents.length &&
            watsonResponse.intents[0].confidence > 0.7
        ) {
            logger.info('Selecting campaign from intent', watsonResponse);
            return this.selectCampaignFromIntent(watsonResponse);
        } else if (previousContext.campaign_id) {
            return this.processResponseContext(previousContext, watsonResponse, participantResponse);
        } else {
            logger.info('Picker got confused. Try again.');
            return {
                updatedContext: {
                    campaign_id: '',
                    language: '',
                    session_id: this.createNewSessionId(),
                    workspace_id: this.WORKSPACE_PICKER_ID,
                    context: {}
                },
                watsonResponse: watsonResponse
            };
        }
    }

    processIntents(participantResponse, watsonResponse) {
        if (watsonResponse.intents.length) {
            const supportedIntents = ['yes', 'no', 'maybe', 'all', 'none'];
            watsonResponse.intents.forEach(intent => {
                if (supportedIntents.indexOf(intent.intent) > -1 && intent.confidence > 0.7) {
                    participantResponse.recognisedPredefinedAnswer.push(intent.intent);
                }
            });
        }
    }

    processEntities(participantResponse, watsonResponse) {
        if (watsonResponse.entities.length) {
            watsonResponse.entities.forEach(entity => {
                if (entity.entity.indexOf('campaign-question-') > -1 && entity.confidence > 0.7) {
                    participantResponse.recognisedPredefinedAnswer.push(entity.value);
                }
            });
        }
    }

    removeDuplicatePredefinedAnswers(participantResponse) {
        if (participantResponse.recognisedPredefinedAnswer.length) {
            const answers = participantResponse.recognisedPredefinedAnswer;
            participantResponse.recognisedPredefinedAnswer = [...new Set(answers)];
        }
    }

    async enrichResponseWithNewContext(participantResponse, watsonResponse) {
        logger.debug('Enriching participantResponse', participantResponse);
        logger.debug('Processing answers from Watson intents and entities', watsonResponse);
        if (participantResponse.dialogNode
            && participantResponse.dialogNode.includes('campaign-question-')) {
            this.processIntents(participantResponse, watsonResponse);
            this.processEntities(participantResponse, watsonResponse);
            this.removeDuplicatePredefinedAnswers(participantResponse);
        }

        this.updateParticipantProfile(participantResponse, watsonResponse);
        await this.checkForNluAnalysisAndUnknownResponses(participantResponse, watsonResponse);
    }

    async checkForNluAnalysisAndUnknownResponses(participantResponse, watsonResponse) {
        if (watsonResponse.context.is_unknown_response) {
            logger.info('This response doesn\'t seem to fit the responses. Flag it!');
            participantResponse.isUnknownResponse = true;
            delete watsonResponse.context['is_unknown_response'];
        }

        if (watsonResponse.context.perform_nlu) {
            logger.info('Response requires NLU analysis. Analysing!');
            await this.analyseResponsesWithNluService(participantResponse);
            delete watsonResponse.context['perform_nlu'];
        }
    }

    updateParticipantProfile(participantResponse, watsonResponse) {
        if (watsonResponse.context.is_demographic_over) {
            this.createOrUpdateUserProfile(participantResponse);
            delete watsonResponse.context['is_demographic_over'];
        }

        if (watsonResponse.context.set_finished) {
            this.setCampaignAsFinishedInParticipantProfile(participantResponse);
            delete watsonResponse.context['set_finished'];
            watsonResponse.context['is_finished'] = 1;
        }
    }

    async createOrUpdateUserProfile(participantResponse) {
        logger.info('Updating participant profile with demographics info and campaign');
        try {
            let profile = new Profile(this.cloudant);
            await profile.init(participantResponse.sessionId);
            await profile.updateFromContextSetCampaignStarted(participantResponse);
            await profile.save();
        } catch (err) {
            logger.error('Error updating participant profile', err);
        }
    }

    async setCampaignAsFinishedInParticipantProfile(participantResponse) {
        logger.info('Updating participant profile with finished campaign');
        try {
            let profile = new Profile(this.cloudant);
            await profile.init(participantResponse.sessionId);
            await profile.finishCampaign(participantResponse.campaignId);
            await profile.save();
        } catch (err) {
            logger.error('Error updating participant profile', err);
        }
    }

    async analyseResponsesWithNluService(campaignResponse) {
        try {
            const nluResponse = await nluService.analyse(
                campaignResponse.rawMessage,
                {
                    sentiment: {},
                    emotion: {},
                    categories: {},
                    keywords: { sentiment: true },
                    entities: { sentiment: true }
                },
                campaignResponse.language || 'en'
            );

            campaignResponse.nlu = {
                sentiment: nluResponse.sentiment,
                emotion: nluResponse.emotion,
                categories: nluResponse.categories,
                keywords: nluResponse.keywords,
                entities: nluResponse.entities
            };
        } catch (nluErr) {
            throw nluErr;
        }
    }

    /**
     * A simple Promise based wrapper around the conversation `message` method
     */
    sendMessageToWatson(messageObject) {
        const assistStart = new Date();
        return new Promise((resolve, reject) => {
            this.client.message(messageObject, (error, conversationResponse) => {
                const assistFinished = (new Date() - assistStart);
                logger.info('[Performance] ASSISTANT_RESPONSE in ' + assistFinished + ' millis');
                if (error) {
                    logger.error('Conversation Error:', error, null, 2);
                    reject(error);
                } else {
                    logger.debug('Watson responded OK', JSON.stringify({
                        intents: conversationResponse.intents,
                        entities: conversationResponse.entities,
                        text: conversationResponse.output.text
                    }));
                    resolve(conversationResponse);
                }
            });
        });
    }
}

module.exports = ConversationService;
