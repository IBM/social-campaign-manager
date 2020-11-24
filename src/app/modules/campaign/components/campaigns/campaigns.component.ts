/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

import { Campaign } from '../../models/campaign';
import { CampaignService } from '../../services/campaign.service';

require('font-awesome-webpack');


@Component({
    selector: 'campaigns',
    templateUrl: './campaigns.component.html',
    styleUrls: ['./campaigns.component.css']
})

export class CampaignsComponent implements AfterViewInit {
    private campaigns: Array<Campaign> = null;
    private loading: boolean = true;

    constructor(private campaignService: CampaignService, private router: Router) { }

    ngAfterViewInit(): void {
        this.campaignService.getAllCampaigns()
            .then((campaigns) => {
                this.campaigns = campaigns;
                this.loading = false;
            }).catch(error => {
                console.error('Error loading campaigns', error);
                this.loading = false;
            });
    }

    moveToCampaign(campaignID: string): void {
        this.router.navigate(['/campaign', campaignID]);
    }
}
