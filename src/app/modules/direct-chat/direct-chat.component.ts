/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as io from 'socket.io-client';
import { ActivatedRoute } from '@angular/router';
import { CampaignService } from '../campaign/services/campaign.service';

@Component({
    selector: 'app-direct-chat',
    templateUrl: './direct-chat.component.html',
    styleUrls: ['./direct-chat.component.css']
})
export class DirectChatComponent implements OnInit, AfterViewInit {
    constructor(private route: ActivatedRoute, private campaignService: CampaignService) { }

    initialisationError: string = '';
    sessionInitialised: boolean = false;
    typingIndicator = false;
    quickReplies = [];
    chatSessionId: string = '';
    chatMessage: string = '';
    campaignId: string = '';
    campaignName: string = 'IBM Social Campaign Manager';
    campaignDesc: string = 'Chat with us to share your views';

    socket: SocketIOClient.Socket;

    messages = [];

    ngOnInit() {
        this.chatSessionId = '';
        this.sessionInitialised = false;
        this.route.params.subscribe((params) => {
            if (params['id']) {
                this.campaignId = params['id'];
                this.campaignService.getCampaignFormData(this.campaignId)
                    .then(res => {
                        this.campaignName = res.name;
                        this.campaignDesc = res.description;
                    });
            }
        });
    }

    ngAfterViewInit() {
        this.socket = io.connect();

        this.socket.on('chat-message', (msg) => this.messageReceived(msg));

        this.socket.on('typing-indicator', () => this.showTypingIndicator());

        this.socket.on('connect', () => {
            this.initialiseChatSession();
        });
    }

    initialiseChatSession() {
        this.initialisationError = null;
        this.chatSessionId = this.socket.id;
        this.sessionInitialised = true;

        this.socket.emit('chat-connect', this.campaignId);
        console.log('Session initialised: ', this.chatSessionId);
    }

    sendChatMessage(quickReply) {
        if (this.sessionInitialised) {
            const messageObj = {
                sender: {
                    name: 'Direct Chat',
                    location: 'IBM',
                    senderId: this.chatSessionId
                },
                campaignId: this.campaignId,
                text: quickReply ? quickReply : this.chatMessage,
                timestamp: new Date().toISOString()
            };

            this.socket.emit('chat-message', messageObj);
            this.chatMessage = '';
        } else {
            this.initialiseChatSession();
        }
    }

    messageReceived(msgObj) {
        if (msgObj.quickReplies) {
            // HACK: Temporarily drop maybe from quick replies in MCQs
            const filterOutMaybe = msgObj.quickReplies.filter(element => {
                return element !== 'Maybe';
            });
            this.quickReplies = filterOutMaybe;
        } else {
            this.quickReplies = [];
        }
        this.typingIndicator = false;
        this.messages.push(msgObj);
    }

    showTypingIndicator() {
        setTimeout(() => {
            this.typingIndicator = true;
            setTimeout(() => { this.typingIndicator = false; }, 3000);
        }, 100);
    }
}
