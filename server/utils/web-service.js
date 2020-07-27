/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const WebServiceResponse = require('./web-service-response');
const logger = require('../utils/logger')('AbstractWebService');


class WebService {
    constructor(expressApp) {
        this.expressApp = expressApp;
    }

    setup() {
        logger.error(
            'Abstract class method WebService.setup() being called. Override this functionality in base class.'
        );
    }

    /**
     * Helper function to get the location where parameters are located.
     */
    paramLocation(requestObject) {
        var paramLocation = null;

        if (requestObject.method === 'POST' || requestObject.method === 'PUT') {
            paramLocation = requestObject.body;
        } else {
            paramLocation = requestObject.query;
        }
        return paramLocation;
    }

    /**
     * Check to see are all required params included in the request before
     * proceeding. Function will automatically return a default response
     * removing the need to have any `else` clause in your code.
     */
    validateQueryParams(paramNames, requestObject, responseObject) {
        const paramLocation = this.paramLocation(requestObject);

        // One by one go through the list of required params and see if they are present
        let allPresentAndNotEmpty = false;
        if (paramLocation) {
            for (let i = 0; i < paramNames.length; i++) {
                if (paramLocation[paramNames[i]] !== null && paramLocation[paramNames[i]] !== undefined) {
                    allPresentAndNotEmpty = true;
                } else {
                    allPresentAndNotEmpty = false;
                    break;
                }
            }
        }

        // If not all present, send back default error response
        if (!allPresentAndNotEmpty) {
            responseObject.status(400).json(WebServiceResponse.responseWithConstant(400, null));
        }

        return allPresentAndNotEmpty;
    }
}

module.exports = WebService;
