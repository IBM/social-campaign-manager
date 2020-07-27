class MessageHandler {

    constructor(sourceStrategy) {
        this.sourceStrategy = sourceStrategy;
    }

    sendTypingIndicator(senderId) {
        this.sourceStrategy.sendTypingIndicator(senderId);
    }

    replyToDirectMessage(recipientId, responseText, quickButtonsContext) {
        this.sourceStrategy.replyToDirectMessage(recipientId, responseText, quickButtonsContext);
    }

    deserialize(msgEvent, messageHandler) {
        return this.sourceStrategy.deserialize(msgEvent, messageHandler);
    }

    initialize(payload) {
        return this.sourceStrategy.initialize(payload);
    }
}

module.exports = MessageHandler;
