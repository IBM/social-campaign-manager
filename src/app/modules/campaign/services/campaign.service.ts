/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@angular/core';
import { NetworkingService } from '../../../services/networking.service';
import { Campaign } from '../';
import { CampaignDraft, CampaignForm } from '../models/data-model';

@Injectable()
export class CampaignService {
    currentCampaign: Campaign;

    constructor(private networkService: NetworkingService) { }

    getAllCampaigns(): Promise<Campaign[]> {
        return this.networkService
            .getRequest('api/campaign', { })
            .then(response => {
                let objects: Campaign[] = [];

                response.json().responseObject.forEach((json: any) => {
                    objects.push(new Campaign(json));
                });

                return Promise.resolve(objects);
            })
            .catch(this.handleError);
    }

    getCampaignFormData(campaignId: string): Promise<CampaignForm> {
        return this.networkService
            .getRequest('api/campaign', { campaignId: campaignId })
            .then(response => {
                let json = response.json().responseObject;
                return Promise.resolve(json[0]);
            })
            .catch(this.handleError);
    }

    saveCampaignFormData(campaignForm: CampaignForm): Promise<CampaignForm> {
        return this.networkService
            .putRequest('api/campaign/save', { campaign: campaignForm })
            .then(response => {
                let json = response.json().responseObject;
                return Promise.resolve(json);
            })
            .catch(this.handleError);
    }

    publishCampaign(campaignForm: CampaignForm): Promise<CampaignForm> {
        return this.networkService
            .postRequest('api/campaign/publish', { campaign: campaignForm })
            .then(response => {
                let json = response.json().responseObject;
                return Promise.resolve(json);
            })
            .catch(this.handleError);
    }

    createCampaignDraft(campaign: CampaignDraft): Promise<any> {
        return this.networkService
            .postRequest('api/campaign-draft', { campaign: campaign })
            .then(function(response) {
                let json = response.json();

                if (json && json.responseObject) {
                    return Promise.resolve(json.responseObject);
                } else {
                    return Promise.resolve(null);
                }
            })
            .catch(this.handleError);
    }

    postTweet(campaignId: string, initialTweet: string, hashtag: string): Promise<any> {
        return this.networkService
            .postRequest('api/campaign/tweet', {
                campaign_id: campaignId,
                twitter_initial_tweet: initialTweet,
                twitter_hashtag: hashtag
            })
            .then(function(response) {
                let json = response.json();

                if (json && json.responseObject) {
                    return Promise.resolve(json.responseObject);
                } else {
                    return Promise.resolve(null);
                }
            })
            .catch(this.handleError);
    }

    deleteCampaign(campaignId: string): Promise<any> {
        return this.networkService
            .deleteRequest('api/campaign?campaignId=' + campaignId)
            .then(response => {
                let json = response.json();
                if (json && json.responseObject) {
                    return Promise.resolve(json.responseObject);
                }
            })
            .catch(this.handleError);
    }

    clearCampaignResponses(campaignId: string): Promise<any> {
        return this.networkService
            .deleteRequest('api/campaign-responses?campaignId=' + campaignId)
            .then(response => {
                let json = response.json();
                if (json && json.responseObject) {
                    return Promise.resolve(json.responseObject);
                }
            })
            .catch(this.handleError);
    }

    getParticipantsByCampaignId(campaignId: string) {
        return this.networkService
            .getRequest('api/campaign-participants', { campaignId: campaignId })
            .then(response => {
                let json = response.json().responseObject;
                if (json) {
                    return Promise.resolve(json);
                } else {
                    return Promise.resolve([]);
                }
            })
            .catch(this.handleError);
    }

    getResponsesByCampaignId(campaignId: string) {
        return this.networkService
            .getRequest('api/campaign-responses', { campaignId: campaignId })
            .then(response => {
                let json = response.json().responseObject;
                if (json) {
                    return Promise.resolve(json);
                } else {
                    return Promise.resolve([]);
                }
            })
            .catch(this.handleError);
    }

    getTweetsByCampaignId(campaignId: string) {
        return this.networkService
            .getRequest('api/campaign-tweets', { campaignId: campaignId })
            .then(response => {
                let json = response.json().responseObject;
                if (json) {
                    return Promise.resolve(json);
                } else {
                    return Promise.resolve([]);
                }
            })
            .catch(this.handleError);
    }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error);
        return Promise.reject(error.message || error);
    }
}
