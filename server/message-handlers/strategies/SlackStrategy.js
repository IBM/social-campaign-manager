const { WebClient } = require('@slack/web-api');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
let slackWebClient;
if (SLACK_BOT_TOKEN) {
    slackWebClient = new WebClient(SLACK_BOT_TOKEN);
}

const logger = require('../../utils/logger')('SlackStrategy');

module.exports = {
    initialize: async () => {
        if (SLACK_BOT_TOKEN) {
            const slackInitialData = await slackWebClient.auth.test();
            const { user_id, team_id, bot_id } = slackInitialData;
            const slackBotsInfo = await slackWebClient.bots.info({ bot: bot_id });
            const app_id = slackBotsInfo['bot'].app_id;
            logger.info('SLACK_BOT_USER_ID initialized:', { user_id, team_id, app_id });
            return { user_id, team_id, app_id };
        } else {
            return {
                user_id: '',
                team_id: '',
                app_id: ''
            };
        }

    },
    sendTypingIndicator: () => {
        logger.debug('Sending typing indicator to Slack Channel [unsupported]');
        // Looks like this is not supported in the Slack Web API. Only in RTM.
    },
    replyToDirectMessage: async (slackChannelId, responseText, quickButtonsContext) => {
        const slackMsg = {
            channel: slackChannelId,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: responseText
                    }
                }
            ]
        };

        const quickReplies = _getQuickReplyOptions(quickButtonsContext);
        const msgWithOptions = getSlackButtonsActionBlock(quickReplies, slackMsg);

        await slackWebClient.chat.postMessage(msgWithOptions);
    },
    deserialize: (event, messageHandler) => {
        logger.debug('Deserializing Slack Message Event', event);

        if (event.type === 'block_actions') {
            return {
                messageHandler: messageHandler,
                sender: {
                    screenName: event.user.id,
                    name: 'user',
                    location: null,
                    senderId: event.channel.id
                },
                text: event.actions[0].text.text,
                received_at_millis: new Date()
            };
        } else {
            return {
                messageHandler: messageHandler,
                sender: {
                    screenName: event.user,
                    name: 'user',
                    location: null,
                    senderId: event.channel
                },
                text: event.text,
                received_at_millis: new Date()
            };
        }
    }
};

function getSlackButtonsActionBlock(quickReplies, slackMsg) {
    try {
        let msgBlock = JSON.parse(JSON.stringify(slackMsg));
        if (quickReplies.length) {
            msgBlock.blocks.push({
                type: 'actions',
                elements: [
                    ...quickReplies.map(answer => {
                        return {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: answer
                            }
                        };
                    })
                ]
            });
        }
        return msgBlock;
    } catch (err) {
        logger.error('Error parsing slack action button options', err);
    }
}

function _getQuickReplyOptions(context) {
    if (context && context.quick_reply_options) {
        return context.quick_reply_options;
    } else {
        return [];
    }
}
