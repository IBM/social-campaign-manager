/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Http, Headers, RequestMethod } from '@angular/http';
import 'rxjs/add/operator/map';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class NetworkingService {

    constructor(private http: Http) { }

    getCancelableRequest(url, parameters?: Object) {
        const req = new Observable((observer) => {
            let headers: Headers = new Headers();
            this.http.get(url, {
                headers: headers,
                params: parameters
            }).subscribe(res => {
                observer.next(res.json());
                observer.complete();
            });
        });
        return req;
    }

    async getRequest(url, parameters?: Object) {
        let headers: Headers = new Headers();

        return this.http.get(url, {
            headers: headers,
            params: parameters
        }).toPromise().catch(async e => {
            if (e.status === 440) {
                console.error('Authentication expired error on POST request. Retrying.', e);
                return this.http.request(url, {
                    headers: headers,
                    params: parameters
                }).toPromise();
            } else {
                console.error('Error on GET request.', e);
                throw e;
            }
        });
    }

    async postRequest(url, body, requestMethod?: RequestMethod) {
        let headers: Headers = new Headers({ 'Content-Type': 'application/json' });

        try {
            body = JSON.stringify(body);
            return this.http.request(url, {
                body: body,
                headers: headers,
                method: requestMethod || RequestMethod.Post
            }).toPromise().catch(async e => {
                if (e.status === 440) {
                    console.error('Authentication expired error on POST request. Retrying.', e);
                    return this.http.request(url, {
                        body: body,
                        headers: headers,
                        method: requestMethod || RequestMethod.Post
                    }).toPromise();
                } else {
                    console.error('Error on POST request.', e);
                    throw e;
                }
            });
        } catch {
            throw 'Error: Incorrect body supplied to request';
        }
    }

    putRequest(url, body) {
        return this.postRequest(url, body, RequestMethod.Put);
    }

    deleteRequest(url, body?) {
        return this.postRequest(url, body, RequestMethod.Delete);
    }
}
