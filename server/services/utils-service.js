/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
    randomInRange: function(min, max) {
        if (!min) min = 0;
        if (!max) max = 100;
        return Math.floor(Math.random() * (max - min)) + min;
    },
    asyncForEach: async function(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
};
