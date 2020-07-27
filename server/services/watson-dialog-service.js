/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const logger = require('../utils/logger')('WatsonDialogService');
const fs = require('fs');

class WatsonDialogService {
    async generateWatsonWorkspace(campaignDoc) {
        try {
            const lang = campaignDoc.language || 'en';
            const templateFile = `../models/workspace_template_${lang}.json`;
            let workspaceTemplate = JSON.parse(JSON.stringify(require(templateFile)));
            this.replaceGeneralWorkspaceDataInTemplate(campaignDoc, workspaceTemplate);
            this.insertChatIntroductionAndConsentToTemplate(campaignDoc, workspaceTemplate);
            this.replaceRequiredGovernanceAnswersInTemplate(campaignDoc, workspaceTemplate);
            this.generateQuestions(campaignDoc, workspaceTemplate);
            fs.writeFile('test-campaignOut.json', JSON.stringify(workspaceTemplate), (err) => { if (err) throw err; });
            return workspaceTemplate;
        } catch (err) {
            logger.error('Error generating Watson Workspace document', err);
            throw err;
        }
    }

    replaceGeneralWorkspaceDataInTemplate(campaignDoc, workspaceTemplate) {
        workspaceTemplate.workspace_id = campaignDoc.watson_workspace_id || null;
        workspaceTemplate.name = campaignDoc.name;
        workspaceTemplate.description = campaignDoc.description;
        workspaceTemplate.language = campaignDoc.language;
        workspaceTemplate.metadata.rev = campaignDoc._rev;
        workspaceTemplate.metadata.campaign_id = campaignDoc._id;
    }

    insertChatIntroductionAndConsentToTemplate(campaignDoc, workspaceTemplate) {
        workspaceTemplate.dialog_nodes.forEach(node => {
            if (node.title === 'additional-introduction') {
                node.output.text.values = [campaignDoc.chat_introduction];
            }
            if (node.title === 'Welcome') {
                node.output.text.values = [campaignDoc.consent_message];
            }
        });
    }

    replaceRequiredGovernanceAnswersInTemplate(campaignDoc, workspaceTemplate) {
        const reqQtsAnswers = campaignDoc.required_questions.reduce((qtsObj, qtn) => {
            qtsObj[qtn.intent] = qtn.response;
            return qtsObj;
        }, {});

        workspaceTemplate.dialog_nodes.forEach(node => {
            if (Object.keys(reqQtsAnswers).includes(node.conditions)) {
                node.output.text.values = [];
                node.output.text.values.push(reqQtsAnswers[node.conditions]);
            }
        });
    }

    generateQuestions(campaignDoc, workspaceTemplate) {
        let previous_sibling = 'additional-introduction';

        for (let q in campaignDoc.questions) {
            const qtn = campaignDoc.questions[q];
            if (qtn.type === 'yes_no_maybe') {
                this.handleYesNoQtn(qtn, previous_sibling, workspaceTemplate);
            } else if (qtn.type === 'multiple_choice') {
                this.handleMultipleChoiceQtn(qtn, previous_sibling, workspaceTemplate);
            } else if (qtn.type === 'free_form') {
                this.handleFreeFormQtn(qtn, previous_sibling, workspaceTemplate);
            }
            previous_sibling = qtn.id;
        }
    }

    handleYesNoQtn(question, previous_sibling, workspaceTemplate) {
        let yesNoTemplate = {
            type: 'standard',
            go_to: null,
            created: new Date().toISOString(),
            dialog_node: question.id,
            parent: 'consent-yes',
            context: {
                quick_reply_options: ['Yes', 'No', 'Maybe']
            },
            conditions: null,
            metadata: {},
            description: '',
            previous_sibling: previous_sibling,
            output: {
                text: {
                    selection_policy: 'sequential',
                    values: [question.text]
                }
            },
            next_step: null
        };

        logger.debug('Q: Creating Yes/No question node', yesNoTemplate);
        workspaceTemplate.dialog_nodes.push(yesNoTemplate);

        let previous_answer_sibling = null;
        for (let ans in question.possible_answers) {
            const possible_answer = question.possible_answers[ans];
            const answerNodeTitle = question.id + '-response-' + possible_answer.answer;

            const answerNodeTemplate = {
                title: answerNodeTitle,
                type: 'standard',
                dialog_node: answerNodeTitle,
                parent: question.id,
                conditions: '#' + possible_answer.answer,
                next_step: {
                    behavior: 'jump_to',
                    selector: 'body',
                    dialog_node: possible_answer.next
                },
                outputRawText: '',
                previous_sibling: previous_answer_sibling
            };

            logger.debug('Creating answer node for ' + question.id, answerNodeTemplate);
            workspaceTemplate.dialog_nodes.push(answerNodeTemplate);

            previous_answer_sibling = answerNodeTitle;
        }

        const ynmAnythingElseNodeTemplate = {
            title: question.id + '-anything-else-response',
            type: 'standard',
            dialog_node: question.id + '-anything-else-response',
            parent: question.id,
            conditions: 'anything_else',
            context: {
                perform_nlu: true,
                is_unknown_response: true
            },
            output: {
                text: {
                    values: [
                        'Your comments will be noted, however I still need the most likely answer.',
                        'Oh, that\'s interesting, however I will still need an answer to the question.'
                    ],
                    selection_policy: 'random'
                }
            },
            next_step: {
                behavior: 'jump_to',
                selector: 'body',
                dialog_node: question.id
            },
            previous_sibling: previous_answer_sibling
        };

        logger.debug('Creating answer node to anything else answer for Y/N/M '
            + question.id, ynmAnythingElseNodeTemplate);
        workspaceTemplate.dialog_nodes.push(ynmAnythingElseNodeTemplate);
    }

    handleMultipleChoiceQtn(question, previous_sibling, workspaceTemplate) {
        const mcqQuestionText = question.text;

        let multipleChoiceTemplate = {
            type: 'standard',
            go_to: null,
            created: new Date().toISOString(),
            dialog_node: question.id,
            parent: 'consent-yes',
            context: {
                quick_reply_options: question.possible_answers
                    .map(item => { return item.answer; })
            },
            conditions: null,
            description: '',
            previous_sibling: previous_sibling,
            output: {
                text: {
                    selection_policy: 'sequential',
                    values: [mcqQuestionText]
                }
            },
            next_step: null
        };

        logger.debug('Q: Creating multiple choice question node', multipleChoiceTemplate);
        workspaceTemplate.dialog_nodes.push(multipleChoiceTemplate);

        const multipleChoiceAnswersEntity = this.createEntityFromAnswers(question.id, question.possible_answers);
        workspaceTemplate.entities.push(multipleChoiceAnswersEntity);

        const recognisedEntityNodeTitle = 'recognised-entity-' + multipleChoiceAnswersEntity.entity;
        const multipleChoiceAnswerNodeTemplate = {
            title: recognisedEntityNodeTitle,
            type: 'standard',
            dialog_node: recognisedEntityNodeTitle,
            parent: question.id,
            conditions: '@' + multipleChoiceAnswersEntity.entity,
            next_step: {
                behavior: 'jump_to',
                selector: 'body',
                dialog_node: question.next
            },
            previous_sibling: null
        };

        logger.debug('Creating multiple choice recognised answers node', multipleChoiceAnswerNodeTemplate);
        workspaceTemplate.dialog_nodes.push(multipleChoiceAnswerNodeTemplate);

        const mcqAllNodeTitle = question.id + '-response-all-answers';
        const mcqAllAnswersNode = {
            title: mcqAllNodeTitle,
            type: 'standard',
            dialog_node: mcqAllNodeTitle,
            parent: question.id,
            conditions: '#all',
            next_step: {
                behavior: 'jump_to',
                selector: 'body',
                dialog_node: question.next
            },
            previous_sibling: recognisedEntityNodeTitle
        };

        logger.debug('Creating multiple choice all answers node', mcqAllAnswersNode);
        workspaceTemplate.dialog_nodes.push(mcqAllAnswersNode);

        const mcqNoneNodeTitle = question.id + '-response-none';
        const mcqNoneNode = {
            title: mcqNoneNodeTitle,
            type: 'standard',
            dialog_node: mcqNoneNodeTitle,
            parent: question.id,
            conditions: '#none',
            next_step: {
                behavior: 'jump_to',
                selector: 'body',
                dialog_node: question.next
            },
            previous_sibling: mcqAllNodeTitle
        };

        logger.debug('Creating multiple choice none node', mcqNoneNode);
        workspaceTemplate.dialog_nodes.push(mcqNoneNode);

        const mcqAnythingElseNodeTemplate = {
            title: question.id + '-anything-else',
            type: 'standard',
            dialog_node: question.id + '-anything-else',
            parent: question.id,
            conditions: 'anything_else',
            context: {
                quick_reply_options: [],
                perform_nlu: true,
                is_unknown_response: true
            },
            next_step: null,
            output: {
                text: {
                    values: [
                        'I find that your answer doesn\'t fit existing answers. Can you tell me more?',
                        'Oh, that\'s an interesting point of view. Can you tell me more?'
                    ],
                    selection_policy: 'random'
                }
            },
            previous_sibling: mcqNoneNodeTitle
        };

        logger.debug('Creating node to unknown mcq response for ' + question.id, mcqAnythingElseNodeTemplate);
        workspaceTemplate.dialog_nodes.push(mcqAnythingElseNodeTemplate);

        const mcqAnythingElseNodeResponseTemplate = {
            title: question.id + '-anything-else-response',
            type: 'standard',
            dialog_node: question.id + '-anything-else-response',
            parent: question.id + '-anything-else',
            conditions: 'anything_else',
            context: {
                perform_nlu: true,
                is_unknown_response: true
            },
            next_step: {
                behavior: 'jump_to',
                selector: 'body',
                dialog_node: question.next
            },
            previous_sibling: null
        };

        logger.debug('Creating follow up node to unknown mcq response for ' + question.id, mcqAnythingElseNodeTemplate);
        workspaceTemplate.dialog_nodes.push(mcqAnythingElseNodeResponseTemplate);
    }

    createEntityFromAnswers(questionId, possibleAnswers) {
        let entityTemplate = {
            entity: questionId + '-' + new Date().getTime(),
            values: [],
            description: null,
            fuzzy_match: true
        };

        possibleAnswers.forEach(answer => {
            const synonym = {
                type: 'synonyms',
                value: answer.answer,
                synonyms: answer.examples
            };
            entityTemplate.values.push(synonym);
        });

        logger.debug('Creating entity', entityTemplate);
        return entityTemplate;
    }

    handleFreeFormQtn(question, previous_sibling, workspaceTemplate) {
        let freeFormTemplate = {
            type: 'standard',
            go_to: null,
            created: new Date().toISOString(),
            dialog_node: question.id,
            parent: 'consent-yes',
            context: {
                quick_reply_options: []
            },
            conditions: null,
            metadata: {},
            description: '',
            previous_sibling: previous_sibling,
            output: {
                text: {
                    selection_policy: 'sequential',
                    values: [question.text]
                }
            },
            next_step: null
        };

        logger.debug('Q: Creating Free Form question node', freeFormTemplate);
        workspaceTemplate.dialog_nodes.push(freeFormTemplate);

        const answerNodeTemplate = {
            title: question.id + '-anything-else-response',
            type: 'standard',
            dialog_node: question.id + '-anything-else-response',
            parent: question.id,
            conditions: 'anything_else',
            context: {
                perform_nlu: true
            },
            next_step: {
                behavior: 'jump_to',
                selector: 'body',
                dialog_node: question.next
            },
            outputRawText: '',
            previous_sibling: null
        };

        logger.debug('Creating answer node to free form question for ' + question.id, answerNodeTemplate);
        workspaceTemplate.dialog_nodes.push(answerNodeTemplate);
    }
}

module.exports = WatsonDialogService;
