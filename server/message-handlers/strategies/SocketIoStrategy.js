let websocketIO;

module.exports = {
    initialize: (io) => {
        websocketIO = io;
    },
    sendTypingIndicator: (senderId) => {
        websocketIO.to(senderId).emit('typing-indicator', senderId);
    },
    replyToDirectMessage: (recipientId, responseText, quickButtonsContext) => {
        const messageObj = {
            sender: {
                name: 'Midy',
                location: 'IBM Innovation Exchange HQ',
                senderId: 'midy'
            },
            text: responseText,
            timestamp: new Date().toISOString(),
            quickReplies: _getQuickReplyOptions(quickButtonsContext)
        };

        websocketIO.to(recipientId).emit('chat-message', messageObj);
    },
    deserialize: (event, messageHandler) => {
        if (event && event.sender) {
            const message = {
                messageHandler: messageHandler,
                sender: {
                    screenName: event.sender.screenName ? event.sender.screenName : '',
                    name: event.sender.name ? event.sender.name : '',
                    location: event.sender.location ? event.sender.location : null,
                    senderId: event.sender.senderId ? event.sender.senderId : ''
                },
                text: event.text,
                received_at_millis: new Date()
            };

            return message;
        }
    }
};

function _getQuickReplyOptions(context) {
    if (context && context.quick_reply_options) {
        return context.quick_reply_options;
    } else {
        return [];
    }
}
