/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input } from '@angular/core';
import { CampaignForm } from '../../models/data-model';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'campaign-checklist-header',
    templateUrl: './campaign-checklist-header.component.html',
    styleUrls: ['./campaign-checklist-header.component.css']
})
export class CampaignChecklistHeaderComponent {
    QuestionsValid: boolean = false;
    TwitterValid: boolean = false;
    GovernanceValid: boolean = false;
    DialogValid: boolean = false;

    @Input()
    campaign: CampaignForm;

    fragment: string;

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        this.route.fragment.subscribe(fragment => { this.fragment = fragment; });
    }

    ngAfterViewChecked(): void {
        try {
            if (this.fragment) {
                document.querySelector('#' + this.fragment).scrollIntoView({ behavior: 'smooth' });
                this.fragment = '';
            }
        } catch (e) { }
    }

    ngDoCheck() {
        this.validateCampaign(this.campaign);
    }

    async validateCampaign(campaign) {
        this.checkQuestions(campaign);
        this.checkSocialMedia(campaign);
        this.checkRequiredGovernanceQts(campaign);
        this.checkDialog(campaign);
    }

    checkQuestions(campaign) {
        if (campaign.questions.length) {
            this.QuestionsValid = true;
        } else {
            this.QuestionsValid = false;
        }
    }

    checkSocialMedia(campaign) {
        if (campaign.twitter_initial_tweet.length > 3
            || campaign.twitter_hashtag.length > 3) {
            this.TwitterValid = true;
        } else {
            this.TwitterValid = false;
        }
    }

    checkRequiredGovernanceQts(campaign) {
        let govIsValid = true;
        for (let govQtn of campaign.required_questions) {
            if (govQtn.response.length < 2) {
                govIsValid = false;
                break;
            }
        }

        if (!campaign.consent_message.length) {
            govIsValid = false;
        }
        this.GovernanceValid = govIsValid;
    }

    checkDialog(campaign) {
        if (campaign.name.length > 3 &&
            campaign.description.length > 3 &&
            campaign.chat_introduction.length > 3 &&
            campaign.picker_intent_examples.length > 3
            ) {
            this.DialogValid = true;
        } else {
            this.DialogValid = false;
        }
    }
}
