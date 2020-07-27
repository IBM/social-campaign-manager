/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const CloudantConstants = require('../data-providers/cloudant/cloudant-constants');
const Response = require('../models/response');
const logger = require('../utils/logger')('directMessagingActionHandler');

const predefinedResponses = require('../models/predefined_responses_en.json');

const ConversationService = require('../services/conversation-service');
const CampaignsService = require('../services/campaigns-service');
const ThrottleService = require('../services/throttle-service');
const { asyncForEach } = require('../services/utils-service');

const TwitterService = require('../services/twitter-service');
const twitterService = new TwitterService();

const MessageHandler = require('../message-handlers/message-handler');
const { TwitterStrategy, SocketIoStrategy, SlackStrategy } = require('../message-handlers/strategies');

const socketIoMessageHandler = new MessageHandler(SocketIoStrategy);
const twitterMessageHandler = new MessageHandler(TwitterStrategy);
const slackMessageHandler = new MessageHandler(SlackStrategy);

let conversationService, campaignsService, throttleService;

let SLACK_BOT_USER_ID, SLACK_TEAM_ID, SLACK_APP_ID;

class DirectMessagingActionHandler {
    constructor(providerInstances) {
        this.cloudantManager = providerInstances.cloudant;
        this.redisClient = providerInstances.redis.client;
        this.io = providerInstances.io;
        socketIoMessageHandler.initialize(providerInstances.io);
        slackMessageHandler.initialize().then(initialData => {
            SLACK_TEAM_ID = initialData.team_id;
            SLACK_BOT_USER_ID = initialData.user_id;
            SLACK_APP_ID = initialData.app_id;
        });

        conversationService = new ConversationService(providerInstances.cloudant, providerInstances.redis.client);
        campaignsService = new CampaignsService(providerInstances.cloudant);
        throttleService = new ThrottleService(this.redisClient);

        this.io.on('connection', socket => {
            logger.info('User connected to direct chat window id: ', socket.id);

            socket.on('chat-connect', campaignId => {
                if (campaignId && campaignId.length) {
                    this.presetCampaignByCampaignId(campaignId, socket.id);
                }
                setTimeout(() => {
                    const quickReplyStart = { quick_reply_options: ['Start survey']};
                    socketIoMessageHandler.replyToDirectMessage(socket.id,
                        predefinedResponses.direct_chat_welcome, quickReplyStart);
                }, 2000);
            });

            socket.on('chat-message', async (msg) => {
                if (msg.sender.senderId !== 'midy') {
                    this.io.to(socket.id).emit('chat-message', msg);

                    try {
                        const userId = msg.sender.senderId;
                        await throttleService.throttle(userId);
                        const msgObject = socketIoMessageHandler.deserialize(msg, socketIoMessageHandler);
                        this.directMessageReceived(msgObject);
                    } catch (err) {
                        // We don't have capacity - reply with decline message
                        logger.error('Chat DM declined due to capacity', err);
                        const dmSenderId = msg.sender.senderId;
                        const declineResponse = predefinedResponses.throttle_decline_message;
                        socketIoMessageHandler.replyToDirectMessage(dmSenderId, declineResponse);
                    }
                }
            });

            socket.on('disconnect', () => {
                logger.info('User disconnected from direct chat window');
            });
        });
    }

    async parseTwitterWebhookEvent(event) {
        logger.info('Received webhook event');
        if (event.tweet_create_events) {
            logger.info('Received TWEET_WEBHOOK_EVENT at: ' + new Date().toISOString());
            if (event.tweet_create_events[0].user.id_str !== process.env.TWITTER_USER_ID) {
                this.handleTweet(event.tweet_create_events[0]);
            }
        } else if (event.direct_message_events) {
            logger.info('Received DIRECT_MESSAGE_WEBHOOK_EVENT');
            if (event.direct_message_events[0].message_create.target.recipient_id === process.env.TWITTER_USER_ID) {
                const userId = event.direct_message_events[0].message_create.sender_id;
                try {
                    await throttleService.throttle(userId);
                    this.handleTwitterDirectMessage(event);
                } catch (err) {
                    // We don't have capacity - reply with decline message
                    logger.error('Twitter DM declined due to capacity');
                    const msgObj = twitterMessageHandler.deserialize(event, twitterMessageHandler);
                    const twitterSenderId = msgObj.sender.senderId;
                    const declineResponse = predefinedResponses.throttle_decline_message;
                    msgObj.messageHandler.replyToDirectMessage(twitterSenderId, declineResponse);
                }
            }
        }
    }

    /*
     * An @mention will send a predefined response to the Slack channel the app was mentioned on
     */
    parseSlackMentionEvent(event) {
        const welcomeMessage = predefinedResponses.slack_app_mention
            .replace('{APP_LINK}', `slack://app?team=${SLACK_TEAM_ID}&id=${SLACK_APP_ID}&tab=home`);
        const channelId = event.channel;
        slackMessageHandler.replyToDirectMessage(channelId, welcomeMessage);
    }

    /*
     * Parse actions payload when user clicks on a response button
     */
    parseSlackActionEvent(payloadJson) {
        logger.debug('Received a Slack action event');
        const { channel, user } = payloadJson;
        this.handleSlackMessageEvent(payloadJson, channel.id, user.id);
    }

    /*
     * Parse Slack message event when user responds in plain text
     */
    parseSlackMessageEvent(event) {
        logger.debug('Received a Slack message event');
        const { channel, user } = event;
        if (user !== SLACK_BOT_USER_ID) {
            this.handleSlackMessageEvent(event, channel, user);
        }
    }

    /*
     * Handle message throttling of Slack messages and click events
     */
    async handleSlackMessageEvent(event, channel, user) {
        try {
            await throttleService.throttle(user);
            const msgObject = slackMessageHandler.deserialize(event, slackMessageHandler);
            this.directMessageReceived(msgObject);
        } catch (err) {
            // We don't have capacity - reply with decline message
            logger.error('Slack Chat DM declined due to capacity', err);
            const declineResponse = predefinedResponses.throttle_decline_message;
            slackMessageHandler.replyToDirectMessage(channel, declineResponse);
        }
    }

    /*
     * If conversation context doesn't exist initialise with welcome message.
     */
    async parseSlackOpenAppHomeEvent(event) {
        const userId = event.channel;
        const redisValue = await this.redisClient.getAsync(userId);
        if (redisValue) {
            logger.info('[parseSlackOpenAppHomeEvent] User opened App Home view again.');
        } else {
            logger.info('[parseSlackOpenAppHomeEvent] Sending welcome message to user');
            setTimeout(() => {
                const channelId = event.channel;
                const welcomeMessage = predefinedResponses.direct_chat_welcome;
                const quickReplyStart = { quick_reply_options: ['Start survey']};
                slackMessageHandler.replyToDirectMessage(channelId, welcomeMessage, quickReplyStart);
            }, 2000);
        }
    }

    handleTweet(event) {
        logger.info('Tweet Event', event);
        if (event.in_reply_to_status_id_str) {
            this.handleTweetAnalysisAndResponse(event, event.in_reply_to_status_id_str);
        }
    }

    // Tweet that is in response to a Tweet that we published, or a reply to one of ours
    async handleTweetAnalysisAndResponse(tweetData, responseId) {
        try {
            const dbResp = await campaignsService.getCampaignByInitialTweetId(responseId);
            if (dbResp && dbResp.length) {
                const campaign = dbResp[0];
                logger.debug('Found campaign related to tweet.', campaign);

                const participantTwitterHandle = tweetData.user.screen_name;
                const tweetThreadId = tweetData.id_str;
                const invitationTweetOwner = tweetData.in_reply_to_user_id_str;
                logger.info('This is a campaign tweet. Replying.');

                const chat_link = 'https://twitter.com/messages/compose?recipient_id=' + invitationTweetOwner;
                const randomTweetResponse = conversationService.getRandomTweetResponse(chat_link);
                await twitterService.replyToTweet(participantTwitterHandle, tweetThreadId, randomTweetResponse);
            } else {
                logger.info('Campaign not found. Tweet probably not related to campaign.');
            }
        } catch (err) {
            logger.error('Error handling tweet response to initial tweet', err);
            throw err;
        }
    }

    handleTwitterDirectMessage(event) {
        logger.info('[handleTwitterDirectMessage] handling direct message');
        const messageObject = twitterMessageHandler.deserialize(event, twitterMessageHandler);
        this.directMessageReceived(messageObject);
    }

    async presetCampaignByCampaignId(campaignId, socketId) {
        const campaignRes = await campaignsService.getCampaignById(campaignId,
            ['name', 'watson_workspace_id', 'language']);
        if (campaignRes && campaignRes.length) {
            await conversationService.presetConversationRedisForCampaign(campaignRes[0], socketId);
            this.io.to(socketId).emit('chat-message', 'Selected campaign: ' + campaignRes[0].name);
        } else {
            this.io.to(socketId).emit('chat-message', 'Type something to say hello');
        }
    }

    deleteParticipantsRedisCache(redisKey) {
        return this.redisClient.delAsync(redisKey);
    }

    getParticipantsResponsesDocs(senderId) {
        const selector = {
            selector: {
                socialMediaUserId: senderId
            },
            fields: ['_id', '_rev', 'rawMessage']
        };

        return this.cloudantManager.read(CloudantConstants.DATABASE_RESPONSES, selector);
    }

    processSpecialConversationCommands(dmJson) {
        if (dmJson.text.toLowerCase() === 'start again') {
            this.restartConversationWithSameSessionId(dmJson);
            throw 'start again';
        } else if (dmJson.text.toLowerCase() === 'restart fresh') {
            this.restartConversationNoContext(dmJson);
            throw 'cleared context';
        }
    }

    restartConversationWithSameSessionId(msgObj) {
        conversationService.clearRedisContext(msgObj.sender.senderId)
            .then(() => {
                return msgObj.messageHandler.replyToDirectMessage(msgObj.sender.senderId, 'Conversation Restarted');
            })
            .catch(error => {
                logger.error('COMMAND ERROR:', error);
                return msgObj.messageHandler.replyToDirectMessage(msgObj.sender.senderId, 'COMMAND ERROR');
            });
    }

    restartConversationNoContext(msgObj) {
        this.deleteParticipantsRedisCache(msgObj.sender.senderId)
            .then(() => {
                return msgObj.messageHandler.replyToDirectMessage(msgObj.sender.senderId,
                    'Conversation Context Deleted');
            })
            .catch(error => {
                logger.error('COMMAND ERROR:', error);
                return msgObj.messageHandler.replyToDirectMessage(msgObj.sender.senderId,
                    'COMMAND ERROR');
            });
    }

    async removeParticipantsResponses(senderId) {
        try {
            let responsesDocs = await this.getParticipantsResponsesDocs(senderId);
            for (let doc of responsesDocs) {
                doc._deleted = true;
            }
            await this.cloudantManager.bulk(CloudantConstants.DATABASE_RESPONSES, responsesDocs);
        } catch (err) {
            logger.error('Error removing user responses', err);
            throw err;
        }
    }

    async removeParticipantsProfile(senderId) {
        try {
            const userProfileSelector = {
                selector: {
                    'socialMediaUserId': senderId
                },
                fields: ['_id', '_rev']
            };
            let profileDocs = await this.cloudantManager.read(CloudantConstants.DATABASE_PROFILES, userProfileSelector);
            for (let doc of profileDocs) {
                doc._deleted = true;
            }
            await this.cloudantManager.bulk(CloudantConstants.DATABASE_PROFILES, profileDocs);
        } catch (err) {
            logger.error('Error removing user profile info', err);
            throw err;
        }
    }

    async processOptOutOfCampaign(msgObj) {
        const senderId = msgObj.sender.senderId;
        try {
            await this.removeParticipantsResponses(senderId);
            await this.removeParticipantsProfile(senderId);

            logger.info('User data has been deleted');
            return msgObj.messageHandler.replyToDirectMessage(
                senderId,
                'Thank you, your data has been marked for deletion. ' +
                    'The data will be permanently deleted within the next 7 days.'
            );
        } catch (error) {
            logger.error('Error Opting-out COMMAND ERROR:', error);
            return msgObj.messageHandler.replyToDirectMessage(senderId, 'COMMAND ERROR');
        }
    }

    async directMessageReceived(msgObj) {
        logger.info('[directMessageReceived] Received DM');
        logger.debug('[directMessageReceived] DM contents', msgObj);
        msgObj['received_at_millis'] = new Date();
        const twitterSenderId = msgObj.sender.senderId;
        msgObj.messageHandler.sendTypingIndicator(twitterSenderId);

        try {
            await this.processSpecialConversationCommands(msgObj);
        } catch (cmd) {
            logger.info('[directMessageReceived] PROCESSED SPECIAL COMMAND:', cmd);
            return;
        }

        let participantResponse = new Response(msgObj);
        const watsonResponse = await conversationService.sendChatMessage(msgObj, participantResponse);
        await this.saveResponseToDatabase(participantResponse);

        const assistantResponsesArray = watsonResponse.output.text;
        await this.sendResponsesFromAssistantInDM(assistantResponsesArray, msgObj, watsonResponse.context);
        const timeTookToProcess = (new Date() - msgObj.received_at_millis);
        logger.info('[directMessageReceived] Processed DM in ' + timeTookToProcess + ' millis');
    }

    async saveResponseToDatabase(participantResponse) {
        logger.debug('Enriched participant response', participantResponse);
        if (participantResponse.dialogNode.includes('campaign-question-')) {
            this.saveCampaignResponseToDatabase(participantResponse);
        }
    }

    saveCampaignResponseToDatabase(campaignResponse) {
        return this.cloudantManager.create(CloudantConstants.DATABASE_RESPONSES, campaignResponse);
    }

    async sendResponsesFromAssistantInDM(watsonResponsesArray, msgObj, context) {
        logger.debug('[sendResponsesFromAssistantInDM] Sending responses from Watson to user DM', {
            watsonResponsesArray, msgObj, context
        });

        if (watsonResponsesArray && watsonResponsesArray.length) {
            asyncForEach(watsonResponsesArray, async (responseMsg, index) => {
                try {
                    if (index === watsonResponsesArray.length - 1) {
                        await msgObj.messageHandler.replyToDirectMessage(msgObj.sender.senderId, responseMsg, context);
                    } else {
                        await msgObj.messageHandler.replyToDirectMessage(msgObj.sender.senderId, responseMsg);
                    }
                } catch (error) {
                    logger.error('Error sending message in DM', error);
                    throw error;
                }
            });
        }
    }

    async getOverallSentimentResultsByCampaignId(campaignId) {
        try {
            const sentiment = await campaignsService.getSentimentResultsByCampaignId(campaignId);
            const overallSentimentLabel = this.getOverallSentimentLabel(sentiment.overallSentiment);
            const resultString =
                'At a high level, ' +
                parseInt(sentiment.positive * 100) +
                '% of responses were positive, ' +
                parseInt(sentiment.negative * 100) +
                '% were negative and ' +
                parseInt(sentiment.neutral * 100) +
                '% were undecided. \n' +
                'The overall sentiment was ' +
                overallSentimentLabel;
            return resultString;
        } catch (err) {
            logger.error('Error getting results data: ', err);
            throw err;
        }
    }

    getOverallSentimentLabel(sentiment) {
        let sentimentLabel = 'NEUTRAL';
        if (sentiment < -0.2) {
            sentimentLabel = 'NEGATIVE';
        } else if (sentiment > 0.2) {
            sentimentLabel = 'POSITIVE';
        }
        return sentimentLabel;
    }

    getQuestionTextByDialogNodeId(campaignQuestions) {
        return campaignQuestions.reduce((remappedQuestions, question) => {
            remappedQuestions[question.id] = question.text;
            return remappedQuestions;
        }, {});
    }

    async getCampaignKeyFindingsResponse(campaignId) {
        try {
            const campaignPromise = campaignsService.getCampaignById(campaignId, ['name', 'questions']);
            const sentimentPromise = campaignsService.getResponsesSentimentByCampaignIdFromDb(campaignId);
            const [campaignData, responses] = await Promise.all([campaignPromise, sentimentPromise]);

            if (campaignData.length && responses.length) {
                const questions = this.getQuestionTextByDialogNodeId(campaignData[0].questions);

                const [positiveSorted, negativeSorted, unknownSorted] = this.getResponsesSortedByQuestionSentiment(
                    responses
                );
                const responseString = this.getFindingsResponseString(
                    campaignData[0].name,
                    questions,
                    positiveSorted,
                    negativeSorted,
                    unknownSorted
                );

                logger.info('Fetched findings ', responseString);
                return responseString;
            } else {
                return 'There are no major findings just yet.';
            }
        } catch (err) {
            logger.error('Unable to fetch data for RESULTS_KEY_FINDINGS', err);
            throw 'Unable to fetch data for RESULTS_KEY_FINDINGS';
        }
    }

    getResponsesSortedByQuestionSentiment(responses) {
        let sentimentPerQuestion = {
            positive: {},
            neutral: {},
            negative: {}
        };

        let mostUnknownResponses = {};

        for (let response of responses) {
            if (
                response.nlu &&
                response.nlu.sentiment &&
                response.nlu.sentiment.document &&
                response.nlu.sentiment.document.label
            ) {
                const responseSentiment = response.nlu.sentiment.document.label;
                const questionDialogNode = response.dialogNode.split('-anything-else')[0];
                if (sentimentPerQuestion[responseSentiment][questionDialogNode]) {
                    sentimentPerQuestion[responseSentiment][questionDialogNode] += 1;
                } else {
                    sentimentPerQuestion[responseSentiment][questionDialogNode] = 1;
                }
                if (response.isUnknownResponse) {
                    if (mostUnknownResponses[questionDialogNode]) {
                        mostUnknownResponses[questionDialogNode] += 1;
                    } else {
                        mostUnknownResponses[questionDialogNode] = 1;
                    }
                }
            }
        }

        let positiveSorted = [];
        let negativeSorted = [];
        let unknownSorted = [];

        this.sortByMostPositiveNegativeQuestion(
            sentimentPerQuestion,
            mostUnknownResponses,
            positiveSorted,
            negativeSorted,
            unknownSorted
        );

        return [positiveSorted, negativeSorted, unknownSorted];
    }

    sortByMostPositiveNegativeQuestion(
        sentimentPerQuestion,
        mostUnknownResponses,
        positiveSorted,
        negativeSorted,
        unknownSorted
    ) {
        for (let qtnId in sentimentPerQuestion.positive) {
            positiveSorted.push([qtnId, sentimentPerQuestion.positive[qtnId]]);
        }
        for (let qtnId in sentimentPerQuestion.negative) {
            negativeSorted.push([qtnId, sentimentPerQuestion.negative[qtnId]]);
        }
        for (let qtnId in mostUnknownResponses) {
            unknownSorted.push([qtnId, mostUnknownResponses[qtnId]]);
        }

        positiveSorted.sort((a, b) => {
            return b[1] - a[1];
        });
        negativeSorted.sort((a, b) => {
            return b[1] - a[1];
        });
        unknownSorted.sort((a, b) => {
            return b[1] - a[1];
        });
    }

    getFindingsResponseString(campaignName, questions, positiveSorted, negativeSorted, unknownSorted) {
        let findings = 'So far the major findings for ' + campaignName + ' are:\n\n';

        if (positiveSorted.length && positiveSorted[0][0] && questions[positiveSorted[0][0]]) {
            findings +=
                '   - The most positive responses (' +
                positiveSorted[0][1] +
                ') have been ' +
                'recorded against the question: "' +
                questions[positiveSorted[0][0]] +
                '"\n\n';
        }

        if (negativeSorted.length && negativeSorted[0][0] && questions[negativeSorted[0][0]]) {
            findings +=
                '   - The most negative responses (' +
                negativeSorted[0][1] +
                ') have been ' +
                'recorded against the question: "' +
                questions[negativeSorted[0][0]] +
                '"\n\n';
        }

        if (unknownSorted.length && unknownSorted[0][0] && questions[unknownSorted[0][0]]) {
            findings +=
                '   - The most ambiguous or unknown responses (' +
                unknownSorted[0][1] +
                ') have been ' +
                'recorded against the question: "' +
                questions[unknownSorted[0][0]] +
                '"\n\n';
        }

        return findings;
    }
}

module.exports = DirectMessagingActionHandler;
