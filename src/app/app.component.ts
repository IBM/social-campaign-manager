/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

export const ROOT_SELECTOR = 'app';

@Component({
    selector: ROOT_SELECTOR,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {

    userGreeting = 'Hello, user';
    userName = 'user';
    hideNavbar = false;
    isLoggedIn = false;

    constructor(private router: Router) { }

    ngOnInit() {
        const campaignFormDisabled = process.env.CAMPAIGN_FORM_ENABLED && process.env.CAMPAIGN_FORM_ENABLED === 'false';

        this.isLoggedIn = this.isUserLoggedIn();
        this.userGreeting = this.getHello()  + ', ';

        if (window.location.href.indexOf('\/chat') > -1 || campaignFormDisabled) {
            this.hideNavbar = true;
        } else {
            this.hideNavbar = false;
        }
    }

    goToLogin(): void {
        localStorage.setItem('previous-url', this.router.url);
        this.router.navigateByUrl('/');
    }

    isUserLoggedIn(): boolean {
        this.userName = 'User';
        return true;
    }

    getRandomInt(max): number {
        return Math.floor(Math.random() * Math.floor(max));
    }

    getHello(): string {
        const hi = ['Hello', 'Cześć', 'Hola', 'Saluton', 'Привіт', 'Hallo', 'Óla', 'Sveiki',
            'Aloha', 'Kaixo', 'Dia dhuit', 'Hei', 'Hej', '你好', 'Ahoj', 'Salve', 'Szia',
            'Salut', 'Ciao', 'γεια', 'Namaste', 'Tere', 'Merhaba', 'Здравейте', 'Zdravo'];
        return hi[this.getRandomInt(hi.length)];
    }

    userProfile() {
        // TODO: Open the user profile popup.
    }
}
