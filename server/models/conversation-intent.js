'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const Example = require('./conversation-example');

class ConversationIntent {
    constructor(json) {
        this.intent = json.intent || 'BROKEN_INTENT_NAME';
        this.created = new Date().toJSON();
        this.description = json.description || '';
        this.examples = json.examples.map(example => new Example(example));
    }
}

module.exports = ConversationIntent;
