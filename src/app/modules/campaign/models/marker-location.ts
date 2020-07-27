/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export class MarkerLocation {
    address: string;
    lat: number;
    lng: number;

    constructor(json: any) {
        if (json)  {
            this.address = json.address;
            this.lat = json.lat;
            this.lng = json.lng;
        }
    }
}
