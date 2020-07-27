/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-welcome',
    templateUrl: './app-welcome.component.html',
    styleUrls: ['./app-welcome.component.css']
})

export class AppWelcomeComponent {

    constructor(private router: Router) {
        this.router.navigate(['/campaigns']);
    }

    logIn() { }
}
