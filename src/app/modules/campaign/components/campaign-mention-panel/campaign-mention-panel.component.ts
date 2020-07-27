/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input } from '@angular/core';

@Component({
    selector: 'campaign-mention-panel',
    templateUrl: './campaign-mention-panel.component.html',
    styleUrls: ['./campaign-mention-panel.component.css']
})

export class CampaignMentionPanelComponent {

    @Input() title;
    @Input() items;

    constructor() { }

}
