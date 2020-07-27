/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CampaignDraft } from '../../models/data-model';
import { CampaignService } from '../../services/campaign.service';

const requiredQuestionsTemplateJson = require('../../models/required_governance_questions.json');
const consentMessageTemplateJson = require('../../models/consent_message_template.json');

@Component({
    selector: 'app-campaign-create-draft',
    templateUrl: './campaign-create-draft.component.html'
})
export class CampaignCreateDraftComponent {
    user: any;
    campaignName: string;
    campaignDesc: string;

    constructor(
        private router: Router,
        private campaignService: CampaignService
    ) {
        this.campaignName = '';
        this.campaignDesc = '';
    }

    validate(name, desc) {
        this.campaignName = name;
        this.campaignDesc = desc;
    }

    async createDraftCampaign() {
        if (this.campaignName.length > 5 && this.campaignDesc.length > 5) {
            const required_questions = requiredQuestionsTemplateJson.map(
                qtn => {
                    return {
                        question: qtn.question,
                        intent: qtn.intent,
                        response: ''
                    };
                }
            );

            const campaignDraft: CampaignDraft = {
                name: this.campaignName,
                description: this.campaignDesc,
                consent_message: consentMessageTemplateJson.en,
                required_questions: required_questions
            };

            try {
                const campaignDbObj = await this.campaignService.createCampaignDraft(
                    campaignDraft
                );
                const campaignId = campaignDbObj.id;
                this.router.navigate([`/campaign/${campaignId}/edit`]);
            } catch (err) {
                console.error('Error creating campaign draft', err);
            }
        }
    }
}
