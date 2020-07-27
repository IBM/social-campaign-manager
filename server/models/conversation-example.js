'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

class ConversationExample {
    constructor(json) {
        this.text = json;
        this.created = new Date().toJSON();
    }
}

module.exports = ConversationExample;
