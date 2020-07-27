'use strict';

/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const DataProvider = require('../../utils/data-provider');
const logger = require('../../utils/logger')('cloudantProvider');
const Cloudant = require('cloudant');

/**
 * An Object for holding onto necessary information for the CloudantProvider
 * to automatically managing bulk uploading.
*/
class DatabaseBulkStorage {
    constructor() {
        this.lastUpdated = null;
        this.data = [];
    }
}

class CloudantProvider extends DataProvider {
    constructor(databasesToSetup, viewsToSetup, bulkUploadSize, bulkUploaderTimeout) {
        super();

        try {
            const VCAP = JSON.parse(process.env.VCAP_SERVICES);
            const cloudantCreds = VCAP.cloudantNoSQLDB || VCAP.cloudant;
            this.account = cloudantCreds[0].credentials.username;
            this.password = cloudantCreds[0].credentials.password;
            this.databasesToSetup = databasesToSetup;
            this.viewsToSetup = viewsToSetup;
            this.bulkUploadSize = parseInt(bulkUploadSize);
            this.bulkUploaderTimeout = parseInt(bulkUploaderTimeout);
            this.bulkStorage = {};
            this.bulkRefreshIntervalId = null;
            this.isNewSetup = false;
        } catch (error) {
            logger.error('Unable to get Cloudant credentials from `process.env.VCAP_SERVICES`');
        }
    }

    register() {
        let promise = new Promise((resolve, reject) => {
            this.client = Cloudant({ account: this.account, password: this.password });

            // If the constructor took in an array of databases to make sure are setup
            // Get all the databases, check if one or more don't exist, create them.
            if (this.databasesToSetup && !(this.databasesToSetup instanceof Array)) {
                reject('Constructor first param `databasesToSetup`, must be an array');
            } else if (this.databasesToSetup instanceof Array && this.databasesToSetup.length > 0) {
                this.listAllDatabases()
                    .then(allDbs => {
                        const promises = this.databasesToSetup.map(db => {
                            if (allDbs.indexOf(db) === -1) {
                                this.isNewSetup = true;
                                return this.createDatabase(db);
                            }
                        });
                        return Promise.all(promises);
                    })
                    .then(() => {
                        let promises = [];
                        // This is kinda a hacky way, but there is no point in wasting calls
                        // if we already know the databases don't exist...
                        if (
                            this.isNewSetup &&
                            this.viewsToSetup.constructor === Array &&
                            this.viewsToSetup.length > 0
                        ) {
                            promises = this.databasesToSetup.map(db => {
                                const docsForDB = this.viewsToSetup
                                    .filter(view => view.db_name === db)
                                    .map(docs => docs.view_doc);
                                return this.bulk(db, docsForDB);
                            });
                        }
                        return Promise.all(promises);
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch(error => {
                        reject(error);
                    });
            } else {
                resolve();
            }
        });

        return promise;
    }

    sourceId() {
        return 'cloudant';
    }

    listAllDatabases() {
        let promise = new Promise((resolve, reject) => {
            this.client.db.list((error, allDbs) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(allDbs);
                }
            });
        });

        return promise;
    }

    createDatabase(name) {
        let promise = new Promise((resolve, reject) => {
            this.client.db.create(name, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });

        return promise;
    }

    /**
    Create and update are almost identical, with the exception that an update needs an _id and _rev
    For this reason, we'll check for the existence of these, delete them, then perform the same code for update.
    As otherwise an attempt might be made to move a doc from one db to another, and it will fail as it will
    attempt to perform an update to a non-existant document.
    */
    create(database, doc, customId) {
        if (doc._id && customId !== true) {
            delete doc._id;
        }

        if (doc._rev) {
            delete doc._rev;
        }

        return this.update(database, doc);
    }

    read(database, selector) {
        const db = this.client.db.use(database);

        let promise = new Promise((resolve, reject) => {
            db.find(selector, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.docs);
                }
            });
        });

        return promise;
    }

    update(database, doc) {
        const db = this.client.db.use(database);

        let promise = new Promise((resolve, reject) => {
            db.insert(doc, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        return promise;
    }

    delete(database, id, rev) {
        const db = this.client.db.use(database);

        let promise = new Promise((resolve, reject) => {
            db.destroy(id, rev, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        return promise;
    }

    readFromView(database, designName, viewName, params) {
        const db = this.client.db.use(database);

        let promise = new Promise((resolve, reject) => {
            db.view(designName, viewName, params, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        return promise;
    }

    /**
     * Wrapper around Cloudant bulk upload function. Takes in an array of documents
     * and uploads them as 1 transaction.
    */
    bulk(database, docs) {
        const db = this.client.db.use(database);

        let promise = new Promise((resolve, reject) => {
            db.bulk({ docs: docs }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        return promise;
    }

    /**
     * Adding a document here will place it in a queue to perform a bulk upload when
     * the threshold supplied in the constructor is reached. Also a timer will run to
     * make sure no documents are left in the queue, never reaching the threshold.
    */
    addDocumentToBulkQueue(database, doc) {
        // Check if there is a bulk storage space for this database
        if (!this.bulkStorage[database]) {
            this.bulkStorage[database] = new DatabaseBulkStorage();

            // Will only start once for all uploaders
            this.setupBulkTimeoutChecker();
        }

        let storageObj = this.bulkStorage[database];

        storageObj.lastUpdated = new Date().getTime();
        storageObj.data.push(doc);

        if (storageObj.data.length === this.bulkUploadSize) {
            this.bulk(database, this.bulkStorage[database].data)
                .then(() => {
                    logger.info('Uploaded: ' + this.bulkUploadSize + ' docs to ' + database);
                })
                .catch(error => {
                    logger.error('Error bulk uploading: ' + error);
                });
            this.bulkStorage[database].data = [];
        }
    }

    /**
     * Check all the bulk storage objects once per second to see if they
     * haven't been updated in a greater than or equal number of milliseconds
     * to `bulkUploaderTimeout`.
    */
    setupBulkTimeoutChecker() {
        if (!this.bulkRefreshIntervalId) {
            this.bulkRefreshIntervalId = setInterval(() => {
                const now = new Date().getTime();
                Object.keys(this.bulkStorage).forEach(database => {
                    // If there is a timestamp, and documents in the queue, then check to see
                    // if its been greater than the timeout.
                    if (
                        this.bulkStorage[database].lastUpdated !== null &&
                        this.bulkStorage[database].data.length > 0 &&
                        now - this.bulkStorage[database].lastUpdated >= this.bulkUploaderTimeout
                    ) {
                        const previousLength = this.bulkStorage[database].data.length;

                        this.bulk(database, this.bulkStorage[database].data)
                            .then(() => {
                                logger.info('Bulk uploaded ' + previousLength + ' docs via timeout');
                            })
                            .catch(error => {
                                logger.error('Error bulk uploading via timeout', error);
                            });

                        this.bulkStorage[database].lastUpdated = new Date().getTime();
                        this.bulkStorage[database].data = [];
                    }
                });
            }, 1000);
        }
    }
}

module.exports = CloudantProvider;
