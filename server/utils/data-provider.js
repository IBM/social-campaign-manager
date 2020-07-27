/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const logger = require('../utils/logger')('AbstractDataProvider');
class DataProvider {
    constructor() {
        this.client = null;
    }

    register() {}

    client() {
        return this.client;
    }

    sourceId() {
        logger.error('Abstract DataSource method `sourceId` called. Overwrite this method in subclass');
    }
}

module.exports = DataProvider;
