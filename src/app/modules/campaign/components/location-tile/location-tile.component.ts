/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input, OnInit } from '@angular/core';
import { MarkerLocation } from '../../';

import * as L from 'leaflet';
import 'leaflet.markercluster';


@Component({
    selector: 'location-tile',
    templateUrl: './location-tile.component.html',
    styleUrls: ['./location-tile.component.css']
})

export class LocationTileComponent implements OnInit {

    @Input() locations: MarkerLocation[];

    private map: L.Map;
    private markers: L.MarkerClusterGroup;


    ngOnInit() {
        let mapboxTkn = process.env.MAPBOX_API_TOKEN;
        let osm = L.tileLayer('https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token='
            + mapboxTkn);

        this.map = new L.Map('map', {
            center: new L.LatLng(53.2734, 11.0), // Hard coded to Ireland for now
            zoom: 3,
            scrollWheelZoom: false // Disable by default so map doesn't zoom while scrolling the page
        });

        // Enable scrolling if the user clicks the map
        this.map.on('focus', () => {
            this.map.scrollWheelZoom.enable();
        });

        // Disable scrolling if user clicks away from the map
        this.map.on('blur', () => {
            this.map.scrollWheelZoom.disable();
        });

        // Draw content
        this.map.addLayer(osm);
        this.setupMarkers();
    }

    setupMarkers() {
        if (this.markers) {
            this.map.removeLayer(this.markers);
            this.markers = null;
        }

        if (this.locations) {
            // Convert the locations mentioned by users to markers,
            // Adda popup with the address if clicked.
            // Address is city / town address, not street address.
            this.markers = L.markerClusterGroup();
            const redMarker = new L.Icon({
                iconUrl: '/assets/img/marker-icon.png',
                iconRetinaUrl: '/assets/img/marker-icon-2x.png',
                shadowUrl: '/assets/img/marker-shadow.png',
                iconAnchor: [13, 40],
                popupAnchor: [0, -30]
            });
            this.locations.forEach(location => {
                let marker = L.marker(new L.LatLng(location.lat, location.lng), { icon: redMarker });
                let popup = L.popup().setLatLng([location.lat, location.lng]).setContent(location.address);
                marker.bindPopup(popup);
                this.markers.addLayer(marker);
            });
            this.map.addLayer(this.markers);
        }
    }
}
