/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

type Metadata = {
    api_version: {
        major_version: string,
        minor_version: string
    },
    workspace_hashtag: string,
    workspace_tweet_id: string,
    workspace_tweet_text: string,
    workspace_picker_intent: string,
    workspace_picker_display: string,
    workspace_picker_intent_example: string
};

export class Campaign {
    _id: string;
    _rev: string;
    name: string;
    status: string;
    created: string = new Date().toISOString();
    intents: Array<any> = [];
    updated: string = new Date().toISOString();
    entities: Array<any> = [];
    language = 'en';
    metadata: Metadata = {
        api_version: {
            major_version: '',
            minor_version: '',
        },
        workspace_hashtag: '',
        workspace_tweet_id: '',
        workspace_tweet_text: '',
        workspace_picker_intent: '',
        workspace_picker_display: '',
        workspace_picker_intent_example: ''
    };
    description: string;
    dialog_nodes: Array<any>;
    required_dialog_nodes: Array<any> = [];
    flow_dialog_nodes: Array<any> = [];
    introText: string;
    workspace_id: string;
    counterexamples: Array<any>;
    learning_opt_out: false;
    questions: Array<any> = [];

    /* TODO: This should auto-prep anything that needs to be done to the data.
       Dialog_nodes should not be here or touch, required questions should be
       in their own array as well as questions and everything else.
    */
    constructor(json: any) {
        if (json) {
            this._id = json._id;
            this._rev = json._rev;
            this.name = json.name;
            this.status = json.status;
            this.created = json.created;
            this.intents = json.intents;
            this.updated = json.updated;
            if (json.entities) {
                this.entities = json.entities.filter(entity => entity.values.length > 0 && entity.entity !== 'gender');
            }
            this.language = json.language;
            this.metadata = <Metadata> json.metadata;
            this.description = json.description;
            this.dialog_nodes = json.dialog_nodes;
            if (json.dialog_nodes) {
                const demoNode = json.dialog_nodes.find(element => element.dialog_node === 'ask-demographic');
                if (demoNode) {
                    this.introText = demoNode.metadata.rawText;
                }
                this.questions = json.dialog_nodes
                    .filter(node => node.metadata && node.metadata.hasOwnProperty('order'))
                    .sort((a, b) => {
                        if (a.metadata.order < b.metadata.order) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                this.required_dialog_nodes = json.dialog_nodes.filter(node => node.dialog_node.includes('Q-'));
            }
            this.workspace_id = json.workspace_id;
            this.counterexamples = json.counterexamples;
            this.learning_opt_out = json.learning_opt_out;
        }
    }
}
