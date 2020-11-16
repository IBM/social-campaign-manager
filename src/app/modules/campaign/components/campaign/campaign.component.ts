/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
import { UtilsService } from '../../services/utils.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FlashMessagesService } from 'angular2-flash-messages';
import {
    DbResponse,
    CampaignForm,
    CampaignMetrics,
    QuestionResponses,
    UnknownResponse
} from '../../models/data-model';

require('font-awesome-webpack-4');

@Component({
    selector: 'campaign',
    templateUrl: './campaign.component.html',
    styleUrls: ['./campaign.component.css']
})
export class CampaignComponent implements OnInit, AfterViewInit {
    campaignId: string;
    campaign: CampaignForm;
    loadingCampaign: boolean = true;
    loadingResults: boolean = true;
    confirmDelete: string;

    metrics: CampaignMetrics = {
        percentageComplete: 0,
        uniqueUsers: 0,
        directMessages: 0,
        daysRunning: 0
    };

    nluAnswers = 0;

    sentiment = {
        sentiment: {
            data: []
        },
        emotion: {
            titles: ['Anger', 'Disgust', 'Fear', 'Sadness', 'Joy'],
            data: []
        }
    };

    demographics = {
        locations: [],
        ageRangesData: [],
        genderData: []
    };

    groupedQuestions: Array<QuestionResponses> = [];
    unknownResponses: Array<UnknownResponse> = [];

    campaignResults = {
        overallSentiment: {
            labels: ['positive', 'neutral', 'negative'],
            datasets: [
                {
                    data: [0, 0, 0],
                    backgroundColor: ['#9ECA6B', '#EDAF64', '#EA5B53']
                }
            ]
        },
        overallEmotion: {
            labels: ['sadness', 'joy', 'fear', 'disgust', 'anger'],
            datasets: [
                {
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: ['#7cb5ec', '#9ECA6B', '#7c7dec', '#EDAF64', '#EA5B53']
                }
            ]
        },
        keywords: [],
        entities: [],
        categories: []
    };

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private modalService: NgbModal,
        private campaignService: CampaignService,
        private utilsService: UtilsService,
        private flashMessagesService: FlashMessagesService
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.campaignId = params['id'];
        });
    }

    async ngAfterViewInit(): Promise<void> {
        try {
            const campaignData = await this.campaignService.getCampaignFormData(
                this.campaignId
            );
            console.log(campaignData);
            this.campaign = campaignData;
            this.getDaysRunning();
            this.loadingCampaign = false;

            const participants = await this.campaignService.getParticipantsByCampaignId(
                this.campaignId
            );
            const responses: DbResponse[] = await this.campaignService.getResponsesByCampaignId(
                this.campaignId
            );
            this.prepQuestionsForResponses();
            this.processParticipantData(participants);
            this.processResponses(responses);
            console.log('participants', participants);
            console.log('responses', responses);

            this.loadingResults = false;
        } catch (err) {
            console.error('Error loading campaign data', err);
        }
    }

    processParticipantData(participants) {
        this.metrics.uniqueUsers = participants.length;
        this.getCompletionRate(participants);
        this.getDemographics(participants);
    }

    sortNluByAmountOfMentions(aResult, bResult) {
        const posA = aResult.positive || 0;
        const neuA = aResult.negative || 0;
        const negA = aResult.neutral || 0;

        const posB = bResult.positive || 0;
        const neuB = bResult.negative || 0;
        const negB = bResult.neutral || 0;


        const upperA = posA + neuA + negA;
        const upperB = posB + neuB + negB;

        let result = 0;
        if (upperA > upperB) {
            result = -1;
        } else if (upperA < upperB) {
            result = 1;
        }
        return result;
    }

    compareSentiment(aSentiment, bSentiment) {
        const upperA = aSentiment.y;
        const upperB = bSentiment.y;

        let result = 0;
        if (upperA < upperB) {
            result = 1;
        } else if (upperA > upperB) {
            result = -1;
        }
        return result;
    }

    getDemographics(participants) {
        let ageRangeData = {
            '<18': 0,
            '18-24': 0,
            '25-34': 0,
            '35-44': 0,
            '45-54': 0,
            '55-64': 0,
            '65+': 0
        };

        let genderData = {
            male: 0,
            female: 0,
            other: 0,
            none: 0
        };

        if (participants.length) {
            participants.forEach(participant => {
                const ageRange = this.getAgeRange(participant.age);
                ageRangeData[ageRange]++;
                genderData[participant.gender]++;
                if (participant.locationName && participant.locationData) {
                    this.demographics.locations.push(participant.locationData);
                }
            });

            Object.keys(ageRangeData).forEach((ageRangeKey, index) => {
                this.demographics.ageRangesData.push({
                    name: ageRangeKey,
                    y: ageRangeData[ageRangeKey],
                    color: this.utilsService.getColourByIndex(index)
                });
            });

            Object.keys(genderData).forEach((genderKey, index) => {
                this.demographics.genderData.push({
                    name: genderKey,
                    y: genderData[genderKey],
                    color: this.utilsService.getColourByIndex(index)
                });
            });
        }
    }

    getAgeRange(age) {
        if (age < 18) return '<18';
        else if (age >= 18 && age <= 24) return '18-24';
        else if (age >= 25 && age <= 34) return '25-34';
        else if (age >= 35 && age <= 44) return '35-44';
        else if (age >= 45 && age <= 54) return '45-54';
        else if (age >= 55 && age <= 64) return '55-64';
        else if (age >= 65) return '65+';
    }

    getCompletionRate(participants) {
        let usersStarted = participants.length || 0;
        let usersFinished = 0;
        participants.forEach(human => {
            if (human.campaigns[this.campaignId].finished) {
                usersFinished++;
            }
        });
        this.metrics.percentageComplete =
            usersStarted && usersFinished
                ? Math.floor((usersFinished / usersStarted) * 100)
                : 0;
    }

    prepQuestionsForResponses() {
        this.campaign.questions.forEach(qtn => {
            if (qtn.type === 'yes_no_maybe' || qtn.type === 'multiple_choice') {
                const answers = qtn.possible_answers.reduce(
                    (allAnswers, ans) => {
                        allAnswers[ans.answer] = 0;
                        return allAnswers;
                    },
                    { }
                );
                this.groupedQuestions[qtn.id] = {
                    id: qtn.id,
                    type: qtn.type,
                    text: qtn.text,
                    answers: answers,
                    all: 0,
                    none: 0,
                    graphData: [],
                    nlu: {
                        keywords: [],
                        entities: [],
                        categories: []
                    },
                    totalSentiment: 0
                };
            } else if (qtn.type === 'free_form') {
                this.groupedQuestions[qtn.id] = {
                    id: qtn.id,
                    type: qtn.type,
                    text: qtn.text,
                    answers: [],
                    all: 0,
                    none: 0,
                    graphData: [],
                    nlu: {
                        keywords: [],
                        entities: [],
                        categories: []
                    },
                    totalSentiment: 0
                };
            }
        });
    }

    viewFilterQuestionsByType(type: string) {
        let filteredQts = [];
        Object.keys(this.groupedQuestions).forEach(qtnId => {
            if (this.groupedQuestions[qtnId].type === type)
                filteredQts.push(this.groupedQuestions[qtnId]);
        });
        return filteredQts;
    }

    processOverallEmotion(response) {
        const emotionsFromAnalysedResponse = response.nlu.emotion.document.emotion;

        Object.keys(emotionsFromAnalysedResponse).forEach(emotion => {
            const emotionIndex = this.campaignResults.overallEmotion.labels.indexOf(emotion);
            const currentEmotionTotal = this.campaignResults.overallEmotion.datasets[0].data[emotionIndex];
            const emotionTotal = currentEmotionTotal + emotionsFromAnalysedResponse[emotion];
            this.campaignResults.overallEmotion.datasets[0].data[emotionIndex] = emotionTotal;
        });
    }

    processOverallSentiment(response) {
        const responseSentimentLabel = response.nlu.sentiment.document.label;
        const sentimentIndex = this.campaignResults.overallSentiment.labels.indexOf(responseSentimentLabel);
        const currentSentimentValue = this.campaignResults.overallSentiment.datasets[0].data[sentimentIndex];
        this.campaignResults.overallSentiment.datasets[0].data[sentimentIndex] = currentSentimentValue + 1;
    }

    processPredefinedAnswerResponse(response) {
        const possibleAnswers = Object.keys(
            this.groupedQuestions[response.dialogNode].answers
        );
        const uniquePredefinedAnswers = Array.from(new Set(response.recognisedPredefinedAnswer));
        for (let recognisedAnswer of uniquePredefinedAnswers) {
            const recognisedStr = String(recognisedAnswer);
            if (possibleAnswers.indexOf(recognisedStr) > -1) {
                this.groupedQuestions[response.dialogNode].answers[recognisedStr] += 1;
            } else if (recognisedStr === 'all') {
                Object.keys(this.groupedQuestions[response.dialogNode].answers).forEach(answer => {
                    this.groupedQuestions[response.dialogNode].answers[answer] += 1;
                });
                this.groupedQuestions[response.dialogNode].all += 1;
            } else if (recognisedStr === 'none') {
                this.groupedQuestions[response.dialogNode].none += 1;
            }
        }
    }

    processResponses(responses: DbResponse[]) {
        this.metrics.directMessages = responses.length;
        for (let response of responses) {
            if (response.isUnknownResponse) {
                this.unknownResponses.push({
                    id: response.dialogNode,
                    text: response.rawMessage
                });
            } else if (
                this.groupedQuestions[response.dialogNode] && (
                this.groupedQuestions[response.dialogNode].type === 'yes_no_maybe'
                || this.groupedQuestions[response.dialogNode].type === 'multiple_choice')
            ) {
                this.processPredefinedAnswerResponse(response);
            } else if (this.groupedQuestions[response.dialogNode] &&
                this.groupedQuestions[response.dialogNode].type === 'free_form') {
                this.groupedQuestions[response.dialogNode].answers.push(response.rawMessage);
            } else {
                this.unknownResponses.push({
                    id: response.dialogNode,
                    text: response.rawMessage
                });
            }
            this.processResponseNluResults(response);
        }

        this.prepResponsesGraphs();
    }

    processResponseNluResults(response) {
        // Update campaignResults from NLU
        if (response.nlu) {
            this.processSentiment(response, 'keywords');
            this.processSentiment(response, 'entities');
            this.processCategories(response);
            this.processOverallEmotion(response);
            this.processOverallSentiment(response);
            this.nluAnswers += 1;
        }
    }

    processSentiment(response, targetType) {
        const nluAnalysis = response && response.nlu && response.nlu[targetType] ? response.nlu[targetType] : [];
        const questionId = this.getQuestionIdByNodeId(response.dialogNode);
        for (let target of nluAnalysis) {
            let result;
            if (this.groupedQuestions[questionId]
                && this.groupedQuestions[questionId].nlu
                && this.groupedQuestions[questionId].nlu[targetType]) {
                result = this.groupedQuestions[questionId].nlu[targetType]
                    .find(elem => elem.label === target.text);
            }

            if (result) {
                result[target.sentiment.label] += 1;
            } else {
                result = {
                    label: target.text,
                    positive: 0,
                    neutral: 0,
                    negative: 0
                };
                result[target.sentiment.label] += 1;
                this.groupedQuestions[questionId].nlu[targetType].push(result);
            }
        }

        if (this.groupedQuestions[questionId]
            && this.groupedQuestions[questionId].nlu
            && this.groupedQuestions[questionId].nlu[targetType]) {
            this.groupedQuestions[questionId].nlu[targetType].sort(this.sortNluByAmountOfMentions);
        }
    }

    processCategories(response) {
        const nluAnalysis = response && response.nlu && response.nlu.categories ? response.nlu.categories : [];
        const questionId = this.getQuestionIdByNodeId(response.dialogNode);
        for (let category of nluAnalysis) {
            const subCategories = category.label.split('/');
            for (let subCategory of subCategories) {
                if (subCategory && subCategory !== '') {
                    let cat = this.groupedQuestions[questionId].nlu.categories.find(elem => elem.label === subCategory);
                    if (cat) {
                        cat[response.nlu.sentiment.document.label] += 1;
                    } else {
                        cat = {
                            label: subCategory,
                            positive: 0,
                            neutral: 0,
                            negative: 0
                        };
                        cat[response.nlu.sentiment.document.label] += 1;
                        this.groupedQuestions[questionId].nlu.categories.push(cat);
                    }
                }
            }
        }
        if (this.groupedQuestions[questionId]
            && this.groupedQuestions[questionId].nlu
            && this.groupedQuestions[questionId].nlu.categories) {
            this.groupedQuestions[questionId].nlu.categories.sort(this.sortNluByAmountOfMentions);
        }
    }

    getQuestionTextByNodeId(nodeId) {
        const questionId = nodeId.split('-anything-else')[0];
        return this.groupedQuestions[questionId] ? this.groupedQuestions[questionId].text : nodeId;
    }

    getQuestionIdByNodeId(nodeId) {
        const questionId = nodeId.split('-anything-else')[0];
        return questionId;
    }

    prepResponsesGraphs() {
        Object.keys(this.groupedQuestions).forEach(qtn => {
            if (this.groupedQuestions[qtn].type === 'yes_no_maybe') {
                this.groupedQuestions[qtn].graphData = this.getYesNoGraphData(qtn);
            } else if (this.groupedQuestions[qtn].type === 'multiple_choice') {
                this.groupedQuestions[qtn].graphData = this.getMultipleChoiceGraphData(qtn);
            }
        });
    }

    getYesNoGraphData(qtn) {
        const graphData = {
            labels: Object.keys(this.groupedQuestions[qtn].answers),
            datasets: [
                {
                    data: Object.keys(this.groupedQuestions[qtn].answers).map(
                        (answerKey, index) => {
                            return this.groupedQuestions[qtn].answers[answerKey];
                        }
                    ),
                    backgroundColor: Object.keys(this.groupedQuestions[qtn].answers).map((v, index) => {
                        return this.utilsService.getColourByIndex(index);
                    })
                }
            ]
        };
        return graphData;
    }


    getMultipleChoiceGraphData(qtn) {
        const graphLabels = Object.keys(this.groupedQuestions[qtn].answers);

        const graphData = {
            labels: graphLabels,
            datasets: [
                {
                    data: Object.keys(this.groupedQuestions[qtn].answers).map(
                        (answerKey, index) => {
                            return this.groupedQuestions[qtn].answers[answerKey];
                        }
                    ),
                    backgroundColor: Object.keys(this.groupedQuestions[qtn].answers).map((v, index) => {
                        return this.utilsService.getColourByIndex(index);
                    })
                }
            ]
        };
        return graphData;
    }

    adjustOverallEmotionGraphData() {
        if (this.nluAnswers && this.nluAnswers > 0) {
            this.campaignResults.overallEmotion.datasets[0]
                .data = this.campaignResults.overallEmotion.datasets[0].data.map((val) => {
                    return (val / this.nluAnswers);
                });
        }
    }

    getOverallSentimentCaption() {
        const overallSentimentValues = this.campaignResults.overallSentiment.datasets[0].data;
        const highestValue = Math.max(...overallSentimentValues);
        const allIndexes = this.utilsService.getAllIndexes(overallSentimentValues, highestValue);

        if (highestValue === 0) {
            return 'NONE';
        } else if (allIndexes.length && allIndexes.length === 1) {
            const sentiment = this.campaignResults.overallSentiment.labels[allIndexes[0]];
            return sentiment.toUpperCase();
        } else {
            return 'MIXED';
        }
    }

    getDaysRunning() {
        const oneDay = 24 * 60 * 60 * 1000;
        const now = +new Date();
        const created = this.campaign.created ? +new Date(this.campaign.created) : now;
        this.metrics.daysRunning = Math.round(Math.abs(now - created) / oneDay);
    }

    deleteCampaign(modalContent) {
        this.confirmDelete = '';
        this.modalService.open(modalContent).result.then(
            () => {
                this.loadingCampaign = true;
                this.campaignService
                    .deleteCampaign(this.campaignId)
                    .then(() => {
                        this.loadingCampaign = false;
                        this.router.navigate(['/campaigns']);
                        this.flashMessagesService.show(
                            'Campaign ' +
                                this.campaignService.currentCampaign.name +
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
                        this.loadingCampaign = false;
                        console.error('Error deleting campaign:', error);
                    });
            },
            () => { }
        );
    }
}
