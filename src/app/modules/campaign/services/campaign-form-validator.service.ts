/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@angular/core';
import { CampaignForm } from '../models/data-model';


const ERROR_CODES = {
    GOVERNANCE: 'Governance error: Governance questions are required to be filled before the campaign can be published',
    CONSENT_MISSING: 'Governance error: Missing consent message.',
    QUESTION_NOT_EXIST: 'The campaign needs at least one question.',
    QUESTION_NEED_TEXT: 'Questions need to have some text.',
    CAMPAIGN_NO_END: 'Dialog collision: Looks like the campaign conversation might never end.',
    TWITTER: 'Social Media fields hashtag and tweet content need to be filled to spread the word about the campaign.',
    CHAT_INTRODUCTION: 'The chat introduction needs some content.',
    DESCRIPTION_MISSING: 'The campaign needs a description.',
    PICKER_INTENT_EXAMPLES: 'Picker intent example is missing.',
    CAMPAIGN_NAME_MISSING: 'Campaign name missing.'
};

@Injectable()
export class CampaignFormValidatorService {

    constructor() { }

    async validator(campaign: CampaignForm) {
        try {
            this.checkRequiredGovernanceQuestions(campaign);
            this.checkQuestions(campaign);
            this.checkSocialMedia(campaign);
            this.checkDialogFields(campaign);
            this.pickerIntentChecks(campaign);
            return null;
        } catch (validatorError) {
            return validatorError;
        }
    }

    checkRequiredGovernanceQuestions(campaign) {
        for (let govQtn of campaign.required_questions) {
            if (govQtn.response.length < 2) {
                throw ERROR_CODES.GOVERNANCE;
            }
        }
        if (!campaign.consent_message.length) {
            throw ERROR_CODES.CONSENT_MISSING;
        }
    }

    checkSocialMedia(campaign) {
        if (campaign.twitter_initial_tweet.length < 3
            || campaign.twitter_hashtag.length < 3) {
            throw ERROR_CODES.TWITTER;
        }
    }

    checkDialogFields(campaign) {
        if (campaign.description.length < 3) {
            throw ERROR_CODES.DESCRIPTION_MISSING;
        }

        if (campaign.chat_introduction.length < 3) {
            throw ERROR_CODES.CHAT_INTRODUCTION;
        }
    }

    pickerIntentChecks(campaign) {
        if (campaign.picker_intent.length < 3) {
            throw ERROR_CODES.PICKER_INTENT_EXAMPLES;
        }

        if (campaign.picker_intent_examples.length < 3) {
            throw ERROR_CODES.PICKER_INTENT_EXAMPLES;
        }

        if (campaign.name.length < 3) {
            throw ERROR_CODES.CAMPAIGN_NAME_MISSING;
        }
    }

    checkQuestions(campaign) {
        if (campaign.questions && !campaign.questions.length) {
            throw ERROR_CODES.QUESTION_NOT_EXIST;
        }

        let isEnd = false;
        for (let qtn of campaign.questions) {
            if (qtn.text && qtn.text.length < 2) {
                throw ERROR_CODES.QUESTION_NEED_TEXT;
            }

            if (qtn.next === 'end-campaign-thank-you') {
                isEnd = true;
            }

            if (qtn.possible_answers) {
                for (let ans of qtn.possible_answers) {
                    if (ans.next === 'end-campaign-thank-you') {
                        isEnd = true;
                    }
                }
            }
        }
        if (!isEnd) {
            throw ERROR_CODES.CAMPAIGN_NO_END;
        }
    }
}
