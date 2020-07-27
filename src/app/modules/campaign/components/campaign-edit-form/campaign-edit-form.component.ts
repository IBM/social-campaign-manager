/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { CampaignService } from '../../services/campaign.service';
import { CampaignFormValidatorService } from '../../services/campaign-form-validator.service';
import { CampaignForm } from '../../models/data-model';
import { FlashMessagesService } from 'angular2-flash-messages';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as _ from 'lodash';

const requiredQuestionsTemplateJson = require('../../models/required_governance_questions.json');

@Component({
    selector: 'app-campaign-edit-form',
    templateUrl: './campaign-edit-form.component.html',
    styleUrls: ['./campaign-edit-form.component.css']
})
export class CampaignEditFormComponent implements OnInit {
    loading: boolean;
    twitterLoading: boolean;

    confirmDelete: string;
    confirmationModalDismissBtn: string;
    campaignId: string;
    campaign: CampaignForm;

    QuestionsValid: boolean;
    TwitterValid: boolean;
    GovernanceValid: boolean;
    DialogValid: boolean;

    requiredQuestionsHelpText: Object;
    questionType = {
        yes_no_maybe: 'Yes / No / Maybe',
        multiple_choice: 'Multiple Choice',
        free_form: 'Free Form'
    };

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private modalService: NgbModal,
        private campaignService: CampaignService,
        private campaignFormValidatorService: CampaignFormValidatorService,
        private flashMessagesService: FlashMessagesService
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.campaignId = params['id'];
            if (!this.campaignId) {
                this.router.navigate(['/campaigns']);
            } else {
                this.loading = true;
                this.campaignService
                    .getCampaignFormData(this.campaignId)
                    .then(res => {
                        this.campaign = res;
                        this.updatePickerIntentFields(true);
                        this.loading = false;
                    })
                    .catch(err => {
                        console.error(
                            'Error getting campaign. Returning to campaigns list.',
                            err
                        );
                        this.router.navigate(['/campaigns']);
                        this.loading = false;
                    });
            }
        });
        this.initialiseReqQuestionsHelp();
    }

    initialiseReqQuestionsHelp() {
        this.requiredQuestionsHelpText = requiredQuestionsTemplateJson.reduce(
            (helpText, qtn) => {
                helpText[qtn.intent] = qtn.help;
                return helpText;
            },
            { }
        );
    }

    updatePickerIntentFields(onLoad) {
        if ((onLoad && !this.campaign.picker_intent.length) || !onLoad) {
            this.campaign.picker_intent =
                this.campaign.name.replace(/[^a-zA-Z0-9]/g, '-') + '-intent';
            this.campaign.picker_intent_examples = this.campaign.name;
        }
    }

    validateHashtag() {
        this.campaign.twitter_hashtag = this.campaign.twitter_hashtag.replace(/[^a-zA-Z0-9]/g, '');
    }

    addErrorToInput(id) {
        const newChoice = document.querySelector(id);
        newChoice.classList.add('question-input-error');
    }

    addErrorToMultipleChoice(idPrefix, questionIndex, answerIndex) {
        const elemId = `#${idPrefix}_${questionIndex}_${answerIndex}`;
        const inputElem = document.querySelector(elemId);
        inputElem.classList.add('question-input-error');
    }

    addMultipleChoice(event) {
        // Remove any errors
        event.target.classList.remove('question-input-error');

        const targetId = this.getQuestionId(event);

        // Retrieve the question
        let theQuestion = null;
        if (targetId !== null && !Number.isNaN(targetId)) {
            theQuestion = this.campaign.questions[targetId];
        }

        // Add an options item
        if (!theQuestion.possible_answers) {
            theQuestion.possible_answers = [];
        }
        theQuestion.possible_answers.push({
            answer: '',
            exampleString: '',
            examples: []
        });
    }

    addQuestion() {
        let newQuestion = this.getQuestionTemplate();
        // Set the question ID
        newQuestion.id = `campaign-question-${this.campaign.questions.length + 1}`;
        // Set new flag
        newQuestion['new'] = true;
        // Set edit flag
        newQuestion['edit'] = true;
        // Add the new question to campaign.questions
        this.campaign.questions.push(newQuestion);
    }

    defaultYNM() {
        return [
            {
                answer: 'yes',
                next: ''
            },
            {
                answer: 'no',
                next: ''
            },
            {
                answer: 'maybe',
                next: ''
            }
        ];
    }

    discardChanges(event) {
        const targetId = this.getQuestionId(event);
        this.campaign.questions[targetId] = this.campaign.questions[targetId].orig;
    }

    getAvailableQuestions(questionId) {
        return this.campaign.questions.filter(q => !q.new && q.id !== `campaign-question-${questionId + 1}`);
    }

    getQuestionTypeKeys() {
        return Object.keys(this.questionType);
    }

    getQuestionId(event, pos = 1) {
        let idElem = event.target.id;
        if (idElem === null || idElem === '') {
            const parentId = event.target.parentElement.id;
            if (parentId !== null && parentId !== '') {
                idElem = parentId.split('_')[pos];
            } else {
                return null;
            }
        } else {
            idElem = event.target.id.split('_')[pos];
        }
        return parseInt(idElem, 10);
    }

    getQuestionTemplate() {
        return {
            id: '',
            text: '',
            type: '',
            next: '',
            possible_answers: []
        };
    }

    removeOption(event) {
        const qId = this.getQuestionId(event);
        const oId = this.getQuestionId(event, 2);

        if (oId !== null && !Number.isNaN(oId)) {
            this.campaign.questions[qId].possible_answers.splice(oId, 1);
        }
    }

    removeQuestion(event) {
        const targetId = this.getQuestionId(event);

        const temp = this.campaign.questions.slice(0);

        temp.splice(targetId, 1);

        this.campaign.questions = temp;
    }

    restoreField(event) {
        event.target.classList.remove('question-input-error');
    }

    stopCampaign() {
        this.campaign.status = 'Stopped';
        this.saveCampaignForm();
    }

    saveCampaignForm() {
        this.campaignService
            .saveCampaignFormData(this.campaign)
            .then(res => {
                this.flashMessagesService.show('🥳 Campaign has been saved.', {
                    cssClass: 'alert-info',
                    timeout: 3000,
                    showCloseBtn: true
                });
                this.ngOnInit();
            })
            .catch(err => {
                console.error('Error saving the campaign form', err);
                this.flashMessagesService.show(
                    '😞 An error occurred while saving campaign.',
                    {
                        cssClass: 'alert-danger',
                        timeout: 3000,
                        showCloseBtn: true
                    }
                );
            });
    }

    saveQuestion(event) {
        const targetId = this.getQuestionId(event);

        // Retrieve question
        let theQuestion = this.campaign.questions[targetId];

        if (this.isValid(theQuestion.text)) {
            if (this.validType(theQuestion)) {
                if (this.validAnswers(theQuestion, targetId)) {
                    if (theQuestion.new) {
                        delete theQuestion.new;
                    }

                    if (theQuestion.orig) {
                        delete theQuestion.orig;
                    }

                    if (theQuestion.hasOwnProperty('showExamples')) {
                        delete theQuestion.showExamples;
                    }

                    delete theQuestion.edit;
                }
            } else {
                if (!theQuestion.type || theQuestion.type === '') {
                    this.addErrorToInput(`#editQuestionType_${targetId}`);
                } else {
                    this.addErrorToInput(`#addAnswerForQuestion_${targetId}`);
                }
            }
        } else {
            const targetInput = document.querySelector(
                `#editQuestionText_${targetId}`
            );
            targetInput.classList.add('question-input-error');
        }
    }

    toggleExamples(event, toggle) {
        const qId = this.getQuestionId(event);
        let theQuestion = this.campaign.questions[qId];
        theQuestion['showExamples'] = toggle;
        for (let i = 0; i < theQuestion.possible_answers.length; i++) {
            const examplesField = document.querySelector(`#editQExamples_${qId}_${i}`);
            if (toggle) {
                if (examplesField.classList.contains('hidden')) {
                    examplesField.classList.remove('hidden');
                }
            } else {
                if (!examplesField.classList.contains('hidden')) {
                    examplesField.classList.add('hidden');
                }
            }
        }
    }

    updateQuestion(event) {
        const targetId = this.getQuestionId(event);
        let theQuestion = this.campaign.questions[targetId];

        // If multiple choice we need to create an examples string from the examples array
        if (theQuestion.type === 'multiple_choice') {
            theQuestion.possible_answers.forEach(answer => {
                answer['exampleString'] = answer.examples.toString();
                answer['exampleString'] = answer['exampleString'].replace(/,/g, ', ');
            });
        }

        // Copy the original values in case of discard
        const originalQuestion = JSON.parse(JSON.stringify(theQuestion));
        theQuestion['orig'] = originalQuestion;

        // Flag the question as being edited
        theQuestion.edit = true;
    }

    updateQuestionType(event) {
        const targetId = this.getQuestionId(event);

        if (targetId !== null) {
            // Update an edited question
            let theQuestion = this.campaign.questions[targetId];
            theQuestion.next = '';
            switch (theQuestion.type) {
            case 'yes_no_maybe':
                theQuestion.possible_answers = this.defaultYNM();
                break;
            case 'multiple_choice':
            case 'free_form':
                theQuestion.possible_answers = [];
                break;
            default:
                break;
            }
        }
    }

    validAnswers(aQuestion, id) {
        let isValid = true;
        if (aQuestion.type === 'multiple_choice') {
            for (let i = 0; i < aQuestion.possible_answers.length; i++) {
                const answer = aQuestion.possible_answers[i];
                if (!this.isValid(answer.answer)) {
                    isValid = false;
                    this.addErrorToMultipleChoice('editQMulti', id, i);
                    break;
                }

                if (this.isValid(answer.exampleString)) {
                    let collections = answer.exampleString.split(',');
                    for (let j = 0; j < collections.length; j++) {
                        if (
                            !this.isValid(collections[j]) ||
                            collections[j].length > 64
                        ) {
                            isValid = false;
                            this.addErrorToMultipleChoice(
                                'editQExamples',
                                id,
                                i
                            );
                            break;
                        }
                        collections[j] = collections[j].trim();
                    }
                    answer.examples = collections;
                    delete answer.exampleString;
                } else {
                    answer.examples = [];
                    delete answer.exampleString;
                }
            }
        }
        return isValid;
    }

    isValid(inputText) {
        return inputText && inputText !== '' && /\S/g.test(inputText);
    }

    validType(aQuestion) {
        let isValid = true;
        switch (aQuestion.type) {
        case 'yes_no_maybe':
        case 'free_form':
            break;
        case 'multiple_choice':
            isValid = aQuestion.possible_answers.length >= 2;
            break;
        default:
            isValid = false;
            break;
        }
        return isValid;
    }

    async publish() {
        const validatorError = await this.campaignFormValidatorService.validator(this.campaign);
        if (!validatorError) {
            this.campaignService
                .publishCampaign(this.campaign)
                .then(() => {
                    this.flashMessagesService.show(
                        'The campaign has been published! 🥳 You can now try it out.',
                        {
                            cssClass: 'alert-success',
                            timeout: 3000,
                            showCloseBtn: true
                        }
                    );
                    this.ngOnInit();
                })
                .catch(err => {
                    console.error('Error saving the campaign form', err);
                    this.flashMessagesService.show(
                        'An error occurred while publishing your campaign. Perhaps you have any question collisions?',
                        {
                            cssClass: 'alert-danger',
                            timeout: 3000,
                            showCloseBtn: true
                        }
                    );
                });
        } else {
            this.flashMessagesService.show(
                validatorError,
                {
                    cssClass: 'alert-danger',
                    timeout: 5000,
                    showCloseBtn: true
                }
            );
        }
    }

    postInitialTweet() {
        this.twitterLoading = true;
        this.campaignService
            .postTweet(
                this.campaignId,
                this.campaign.twitter_initial_tweet,
                this.campaign.twitter_hashtag
            )
            .then(() => {
                this.twitterLoading = false;
                this.flashMessagesService.show(
                    'The campaign invitation has been tweeted out',
                    {
                        cssClass: 'alert-success',
                        timeout: 10000,
                        showCloseBtn: true
                    }
                );
                this.ngOnInit();
            })
            .catch(error => {
                this.twitterLoading = false;
                this.flashMessagesService.show(
                    'Tweet was not posted. Please try again later or change the content.',
                    {
                        cssClass: 'alert-danger',
                        timeout: 10000,
                        showCloseBtn: true
                    }
                );
                this.loading = false;
                console.error('Error posting initial Tweet:', error);
            });
    }

    deleteCampaign(modalContent) {
        this.confirmDelete = '';
        this.confirmationModalDismissBtn = 'No, I want to keep the campaign';
        this.modalService.open(modalContent).result.then(
            () => {
                this.loading = true;
                this.campaignService
                    .deleteCampaign(this.campaignId)
                    .then(() => {
                        this.loading = false;
                        this.router.navigate(['/campaigns']);
                        this.flashMessagesService.show(
                            'Campaign ' +
                                this.campaign.name +
                                ' has been deleted successfully',
                            {
                                cssClass: 'alert-success',
                                timeout: 10000,
                                showCloseBtn: true
                            }
                        );
                    })
                    .catch(error => {
                        this.flashMessagesService.show(
                            'Campaign could not be deleted. Please try again later.',
                            {
                                cssClass: 'alert-danger',
                                timeout: 10000,
                                showCloseBtn: true
                            }
                        );
                        this.loading = false;
                        console.error('Error deleting campaign:', error);
                    });
            },
            () => { }
        );
    }

    clearCampaignAnswers(modalContent) {
        this.confirmDelete = '';
        this.confirmationModalDismissBtn = 'No, I want to keep the responses data';
        this.modalService.open(modalContent).result.then(
            async () => {
                try {
                    this.loading = true;
                    await this.campaignService.clearCampaignResponses(this.campaignId);
                    this.loading = false;
                    this.flashMessagesService.show('Cleared campaign responses.', {
                        cssClass: 'alert-success',
                        timeout: 10000,
                        showCloseBtn: true
                    });
                } catch (error) {
                    this.flashMessagesService.show('Could not clear campaign responses. Please try again later.', {
                        cssClass: 'alert-danger',
                        timeout: 10000,
                        showCloseBtn: true
                    });
                    this.loading = false;
                    console.error('Error clearing campaign responses', error);
                }
            },
            () => { }
        );
    }
}
