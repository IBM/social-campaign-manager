/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
    CampaignsComponent,
    CampaignComponent,
    CampaignChecklistHeaderComponent,
    CampaignMentionPanelComponent,
    CampaignCreateDraftComponent,
    CampaignEditFormComponent,
    LocationTileComponent,
    SpinnerComponent,
    TabsComponent,
    Tab,
    CampaignFormValidatorService,
    UtilsService,
    CampaignService
} from './';

import { ChartJsModule } from '../charts';
import { } from './campaign-checklist-header/campaign-checklist-header.component';

/*
 * Custom pipes
 */
import { RevisionTrim } from './pipes/revision-trim.pipe';

@NgModule({
    imports: [
        NgbModule,
        RouterModule,
        CommonModule,
        FormsModule,
        ChartJsModule,
        ReactiveFormsModule
    ],
    declarations: [
        CampaignsComponent,
        CampaignComponent,
        CampaignChecklistHeaderComponent,
        CampaignMentionPanelComponent,
        CampaignCreateDraftComponent,
        CampaignEditFormComponent,
        LocationTileComponent,
        SpinnerComponent,
        TabsComponent,
        Tab,
        RevisionTrim
    ],
    providers: [
        UtilsService,
        CampaignService,
        CampaignFormValidatorService
    ],
    exports: [
        CampaignsComponent,
        CampaignComponent,
        CampaignCreateDraftComponent,
        CampaignEditFormComponent,
        SpinnerComponent,
        LocationTileComponent
    ]
})
export class CampaignModule { }
