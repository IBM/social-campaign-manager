/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();

// Load local VCAP_SERVICES
if (!process.env.VCAP_SERVICES) {
    try {
        process.env.VCAP_SERVICES = JSON.stringify(
            require('./VCAP_SERVICES.json')
        );
    } catch (e) {
        /* eslint-disable no-console */
        console.error('No VCAP_SERVICES file detected. If you are running the application locally'
            + ' download your VCAP_SERVICES file from the IBM Cloud / Application / Runtime tab', e);
    }
}

process.on('unhandledRejection', (error, p) => {
    console.error('Unhandled Rejection at: Promise', p, '\n\nreason:', error);
    console.error('Unhandled stack: \n\n' + error.stack);
    /* eslint-enable no-console */
});

// Global vars and setup
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const cors = require('cors');
app.use(cors());

if (process.env.AUTHENTICATION && process.env.AUTHENTICATION === 'true') {
    const session = require('express-session');
    const passport = require('passport');
    const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;

    app.use(session({
        secret: 'IIXSCM',
        resave: true,
        saveUninitialized: true
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    passport.use(new WebAppStrategy({
        clientId: process.env.IBM_CLOUD_APPID_CLIENT_ID,
        tenantId: process.env.IBM_CLOUD_APPID_TENANT_ID,
        secret: process.env.IBM_CLOUD_APPID_SECRET,
        oAuthServerUrl: process.env.IBM_CLOUD_APPID_OAUTH_URL,
        redirectUri: process.env.IBM_CLOUD_APPID_REDIRECT_URI
    }));

    passport.serializeUser(function(user, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function(obj, cb) {
        cb(null, obj);
    });

    app.get('/login', passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        successRedirect: process.env.IBM_CLOUD_APPID_REDIRECT_URI,
        forceLogin: true
    }));
}

const bodyParser = require('body-parser');
const rawBodySaver = function(req, res, buf) {
    req.rawBody = buf ? buf : '';
};
app.use(bodyParser.json({ limit: '5mb', verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

const logger = require('./server/utils/logger')('app');
const morgan = require('morgan');

app.use(
    morgan('tiny', {
        stream: logger.stream
    })
);

const fs = require('fs');
// Load the config file for the views and the DB...x
const defaultConfig = JSON.parse(
    fs.readFileSync(__dirname + '/defaultCloudantViews.json', 'utf8')
);

// Custom imports
const DataProvidersManager = require('./server/data-providers/data-providers-manager');
const CloudantProvider = require('./server/data-providers/cloudant/cloudant-provider');
const RedisProvider = require('./server/data-providers/redis/redis');

const DirectMessagingActionHandler = require('./server/action-handlers/direct-messaging-action-handler');

const ThrottleService = require('./server/services/throttle-service');

const dbToCreate = [...new Set(defaultConfig.views.map(view => view.db_name))];

const dpm_providers = [
    new CloudantProvider(dbToCreate, defaultConfig.views),
    new RedisProvider()
];

// Register connections to data source providers
const dpm = new DataProvidersManager(dpm_providers);
dpm.loadAllProviders().then(providerInstances => {

    providerInstances.io = io;
    // Setup data providers in services
    const directMessagingActionHandler = new DirectMessagingActionHandler(
        providerInstances
    );

    // No throttling to begin with
    const throttleService = new ThrottleService(providerInstances.redis.client);
    throttleService.init();

    app.use((req, res, next) => {
        req.providerInstances = providerInstances;
        req.directMessagingActionHandler = directMessagingActionHandler;
        next();
    });

    // Load Twitter APIs routes before authentication as Twitter has its own token authentication
    app.use('/', require('./routes/twitter-router'));
    app.use('/', require('./routes/slack-router'));

    // Require web service routes
    app.use('/api', require('./routes/throttle-router'));

    const DISABLE_FRONTEND = process.env.DISABLE_FRONTEND;
    if (DISABLE_FRONTEND && DISABLE_FRONTEND === 'true') {
        logger.info('Application front-end will be disabled');
    } else {
        logger.info('Application front-end enabled');
        app.use('/api', require('./routes/campaigns-router'));
        // Require public front-end app build folder
        app.use(express.static(__dirname + '/dist/'));
    }

    // Default fallback for 404's
    app.use((req, res) => {
        res.status(404).json({ error: 404, message: 'Not found' });
    });


    // Start server
    const cfenv = require('cfenv');
    const appEnv = cfenv.getAppEnv();

    const server = app.listen(appEnv.port, () => {
        logger.info(`Server listening on ${appEnv.url}`);
    });
    io.listen(server);
});
