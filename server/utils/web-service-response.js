/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const logger = require('../utils/logger')('WebServiceResponse');

/*
WebServiceResponse is a standardised response to ensure consistency across reusable webservice
implementations. Each response contains a numeric `code`, a message `success` and an optional
`responseObject` which can be anything.
*/
class WebServiceResponse {
    constructor(code, message, responseObject) {
        this.code = code;
        this.message = message;
        this.responseObject = responseObject;
    }

    /*
    Allows the use of a constants file, for a more shorthand approach to creating instances.
    */
    static responseWithConstant(constant, responseObject) {
        if (
            constant &&
            constant.code !== null &&
            constant.code !== undefined &&
            !isNaN(constant.code) &&
            constant.message
        ) {
            return new WebServiceResponse(constant.code, constant.message, responseObject);
        } else {
            const errorString = 'Invalid constant passed to `responseWithConstant`: '
            + 'Constant must contain a numeric `code` and a string `message`.' +
                + JSON.stringify(constant, null, 2);
            logger.error(errorString);
        }
    }
}

module.exports = WebServiceResponse;
