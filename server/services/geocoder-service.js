/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const geocoder = require('geocoder');
const logger = require('../utils/logger')('geocoderService');

const API_KEY_OBJ = { key: process.env.GOOGLE_API_KEY };

module.exports = function geocode(placeName) {
    return new Promise((resolve, reject) => {
        geocoder.geocode(
            placeName,
            (error, data) => {
                if (error) {
                    reject(error);
                } else if (data.results && data.results.length > 0) {
                    const resultObj = data.results[0];

                    const address = resultObj.formatted_address;
                    const lat = resultObj.geometry.location.lat;
                    const lng = resultObj.geometry.location.lng;

                    logger.info('Fetched geocoder location.');
                    resolve({ address: address, lat: lat, lng: lng });
                } else {
                    logger.warn('No geocoder location available for place.');
                    reject(
                        'No response for `' + placeName + '`. Additional data: ' + JSON.stringify(data, null, 4)
                    );
                }
            },
            API_KEY_OBJ
        );
    });
};
