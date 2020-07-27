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

import { DirectChatComponent } from './direct-chat.component';

@NgModule({
    imports: [NgbModule, RouterModule, CommonModule, FormsModule, ReactiveFormsModule],
    declarations: [DirectChatComponent],
    providers: [],
    entryComponents: [DirectChatComponent],
    exports: [DirectChatComponent]
})
export class DirectChatModule { }
