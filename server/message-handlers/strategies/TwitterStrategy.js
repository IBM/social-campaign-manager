
const TwitterService = require('../../services/twitter-service');
const twitterService = new TwitterService();

module.exports = {
    sendTypingIndicator: (twitterUserIdNumber) => {
        twitterService.sendTypingIndicator(twitterUserIdNumber);
    },
    replyToDirectMessage: (twitterUserId, responseText, quickButtonsContext) => {
        twitterService.replyToDirectMessage(twitterUserId, responseText, quickButtonsContext);
    },
    deserialize: (event, messageHandler) => {
        const senderId = event.direct_message_events[0].message_create.sender_id;
        const message = {
            messageHandler: messageHandler,
            sender: {
                screenName: event.users[senderId].screen_name,
                name: 'user',
                location: null,
                senderId: senderId
            },
            text: event.direct_message_events[0].message_create.message_data.text,
            received_at_millis: new Date()
        };

        return message;
    }
};
