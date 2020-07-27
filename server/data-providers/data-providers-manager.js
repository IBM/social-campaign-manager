'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/*
###
### NOTE: This has been almost replaced with services and will eventually be removed from app.js completely ###
###

DataProvidersManager will act as one class to load, store and manage all the classes
acting as data source clients. This project will have many sources, such as Twitter,
Facebook, Google+, alchemy news etc. Using these sources may or may not require
registration steps, such as requesting Bearer Tokens, and the clients will be used
throughout the app.

To avoid multiple copies of the same clients stepping on each other, they will all
be managed here, inside the singleton.
*/
class DataProvidersManager {
    constructor(providers) {
        this.providers = providers;
        this.providerInstances = {};
        return this;
    }

    async loadAllProviders() {
        logMsg('Configuring Data Providers');
        // For each provider registered in the system
        //   - Call the sourceId() function to get its identifier for later use.
        //   - Call the register() function to do any registration steps required.
        //   - Store the resulting provider with its sourceId in a map for later access.
        // We need to do this synchronously, because providers may depend on each other.
        // This allows us to call out to any other providers inside the `register()` function
        // of a provider so long as they are supplied in the right order. For example a provider
        // may require access to cloudant to store something for later use.
        try {
            let registered = [];
            this.providers.forEach(provider => {
                const sourceId = provider.sourceId();
                this.providerInstances[sourceId] = provider;
                registered.push(provider.register());
            });

            await Promise.all(registered);
            logMsg('Data Providers Registered');
            return this.providerInstances;
        } catch (err) {
            logMsg('Provider registration failed: ' + err);
            throw new Error('Error registering providers', err);
        }
    }
}

function logMsg(txt) {
    // eslint-disable-next-line
    console.log('\n============================\n '
        + txt
        + ' \n============================\n');
}

module.exports = DataProvidersManager;
