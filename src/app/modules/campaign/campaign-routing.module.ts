/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../services/authguard.service';
import {
    CampaignsComponent,
    CampaignComponent,
    CampaignCreateDraftComponent,
    CampaignEditFormComponent
} from './';

const routes: Routes = [
    { path: 'campaigns', canActivate: [AuthGuard], component: CampaignsComponent },
    { path: 'campaign/new', canActivate: [AuthGuard], component: CampaignCreateDraftComponent },
    { path: 'campaign/:id/edit', canActivate: [AuthGuard], component: CampaignEditFormComponent },
    { path: 'campaign/:id', canActivate: [AuthGuard], component: CampaignComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class CampaignRoutingModule { }
