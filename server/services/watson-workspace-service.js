/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const AssistantV1 = require('ibm-watson/assistant/v1');
const logger = require('../utils/logger')('watsonWorkspaceService');

class WatsonWorkspaceService {

    constructor() {
        try {
            const credentials = JSON.parse(process.env.VCAP_SERVICES).conversation[0].credentials;
            this.client = new AssistantV1({
                iam_apikey: credentials.apiKey,
                version: '2018-07-10',
                url: credentials.url
            });
            this.WORKSPACE_PICKER_ID = '';
            this.getAvailableWorkspacesForPicker();
        } catch (err) {
            logger.error('Unable to setup Watson Assistant check your `process.env.VCAP_SERVICES`', err);
            throw err;
        }
    }

    async getAvailableWorkspacesForPicker() {
        try {
            this.client.listWorkspaces(async (err, workspacesList) => {
                if (err) throw err;
                this.setWorkspacePickerId(workspacesList);
            });
        } catch (err) {
            logger.error('Unable to fetch workspaces', err);
            throw 'Unable to fetch workspaces: ';
        }
    }

    setWorkspacePickerId(workspacesList) {
        workspacesList.workspaces.forEach(workspace => {
            if (workspace.name === 'WORKSPACE_PICKER') {
                this.WORKSPACE_PICKER_ID = workspace.workspace_id;
                logger.debug('WORKSPACE PICKER ID:', this.WORKSPACE_PICKER_ID);
            }
        });
    }

    createWorkspace(workspace) {
        return new Promise((resolve, reject) => {
            this.client.createWorkspace(workspace, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    updateWorkspace(workspace) {
        return new Promise((resolve, reject) => {
            this.client.updateWorkspace(workspace, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    deleteWorkspace(workspaceId, pickerIntent) {
        this.client.deleteWorkspace({ workspace_id: workspaceId }, error => {
            if (error) {
                logger.error('Error deleting workspace', error);
                return Promise.reject(error);
            } else if (pickerIntent && pickerIntent.length) {
                return this.deletePickerIntentFromWorkspacePicker(pickerIntent);
            } else {
                return Promise.resolve();
            }
        });
    }

    deletePickerIntentFromWorkspacePicker(pickerIntent) {
        return new Promise((resolve, reject) => {
            const workspacePickerId = this.WORKSPACE_PICKER_ID;
            this.client.deleteIntent({ workspace_id: workspacePickerId, intent: pickerIntent }, (error, response) => {
                if (error) {
                    logger.error('Error removing intent from workspace picker', error);
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    createIntentInWorkspacePicker(pickerIntent) {
        return new Promise((resolve, reject) => {
            const workspacePickerId = this.WORKSPACE_PICKER_ID;
            this.client.createIntent(
                {
                    workspace_id: workspacePickerId,
                    intent: pickerIntent.intent,
                    description: pickerIntent.description,
                    examples: pickerIntent.examples
                },
                (error, response) => {
                    if (error) {
                        logger.error('Error creating intent in workspace picker ', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    updateIntentInWorkspacePicker(pickerIntent) {
        return new Promise((resolve, reject) => {
            const workspacePickerId = this.WORKSPACE_PICKER_ID;
            this.client.updateIntent(
                {
                    workspace_id: workspacePickerId,
                    intent: pickerIntent.intent,
                    description: pickerIntent.description,
                    new_examples: pickerIntent.examples
                },
                (error, response) => {
                    if (error) {
                        logger.error('Error updating intent in workspace picker', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    getIntentFromWorkspacePicker(pickerIntent) {
        return new Promise((resolve, reject) => {
            const workspacePickerId = this.WORKSPACE_PICKER_ID;
            this.client.getIntent(
                {
                    workspace_id: workspacePickerId,
                    intent: pickerIntent.intent
                },
                (error, response) => {
                    if (error) {
                        logger.warn('Intent does not exist in picker. You can create one like this.', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }
}

module.exports = WatsonWorkspaceService;
