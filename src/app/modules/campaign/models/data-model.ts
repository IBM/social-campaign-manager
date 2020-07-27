/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CampaignDraft {
    name: string;
    description: string;
    consent_message: string;
    required_questions: Array<any>;
}

export interface CampaignForm {
    id: string;
    rev: string;
    _rev: string;
    name: string;
    description: string;
    language: string;
    status: string;
    questions: Array<any>;
    required_questions: Array<any>;
    picker_intent: string;
    picker_intent_examples: string;
    twitter_initial_tweet: string;
    twitter_initial_tweet_id: string;
    twitter_hashtag: string;
    chat_introduction: string;
    watson_workspace_id: string;
    watson_workspace: Object;
    created: string;
    created_by: string;
    updated: string;
    updated_by: string;
    published: string;
    published_by: string;
}

export interface CampaignMetrics {
    percentageComplete: Number;
    uniqueUsers: Number;
    directMessages: Number;
    daysRunning: Number;
}

export interface QuestionResponses {
    id: string;
    text: string;
    type: string;
    answers: Array<any>;
    all: number;
    none: number;
    graphData: Array<any>;
    nlu: QuestionNluAnalysis;
    totalSentiment: number;
}

export interface DbResponse {
    campaignId: string;
    dialogNode: string;
    isUnknownResponse: Boolean;
    language: string;
    location: string;
    nlu: any;
    rawMessage: string;
    recognisedPredefinedAnswer: Array<string>;
    sessionId: string;
    socialMediaObjectType: string;
    socialMediaUserId: string;
    timestamp: string;
}

export interface QuestionNluAnalysis {
    keywords: Array<any>;
    entities: Array<any>;
    categories: Array<any>;
}

export interface UnknownResponse {
    id: string;
    text: string;
}
