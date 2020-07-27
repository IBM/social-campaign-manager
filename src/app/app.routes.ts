/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes } from '@angular/router';
import { NoContentComponent } from './modules/no-content';
import { AppWelcomeComponent } from './app-welcome.component';
import { AuthGuard } from './services/authguard.service';

import {
    CampaignsComponent,
    CampaignComponent,
    CampaignCreateDraftComponent,
    CampaignEditFormComponent
    } from './modules/campaign/';
import { DirectChatComponent } from './modules/direct-chat/';

const CHAT_ROUTES: Routes = [
    { path: 'chat', redirectTo: 'chat/', pathMatch: 'full' },
    { path: 'chat/:id', component: DirectChatComponent },
];

const CAMPAIGN_ROUTES: Routes = [{ path: 'campaigns', canActivate: [AuthGuard], component: CampaignsComponent },
    { path: 'campaign/new', canActivate: [AuthGuard], component: CampaignCreateDraftComponent },
    { path: 'campaign/:id/edit', canActivate: [AuthGuard], component: CampaignEditFormComponent },
    { path: 'campaign/:id', canActivate: [AuthGuard], component: CampaignComponent }];

const APP_ROUTES: Routes = [
    { path: '', component: AppWelcomeComponent },
    { path: '**',    component: NoContentComponent }];

let ROUTES;

if (process.env.CAMPAIGN_FORM_ENABLED && process.env.CAMPAIGN_FORM_ENABLED === 'false') {
    ROUTES = CHAT_ROUTES.concat(APP_ROUTES);
} else {
    ROUTES = CHAT_ROUTES.concat(CAMPAIGN_ROUTES).concat(APP_ROUTES);
}

export { ROUTES };
