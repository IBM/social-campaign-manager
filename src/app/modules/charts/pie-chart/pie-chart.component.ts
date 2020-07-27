/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, AfterViewInit, ViewChild, Input, ElementRef } from '@angular/core';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

@Component({
    selector: 'pie-chart',
    templateUrl: './pie-chart.component.html',
    styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements AfterViewInit {
    @ViewChild('pieChart', { read: ElementRef }) private chartRef: ElementRef;
    chart: any;

    @Input()
    data: any = null;

    ngAfterViewInit() {
        setTimeout(() => {
            if (this.data) {
                this.chart = new Chart(this.chartRef.nativeElement, {
                    type: 'doughnut',
                    data: this.data,
                    plugins: [ChartDataLabels],
                    options: {
                        legend: {
                            display: true,
                            position: 'bottom'
                        },
                        tooltips: {
                            enabled: true
                        },
                        plugins: {
                            datalabels: {
                                formatter: (value, ctx) => {
                                    if (value == 0) {
                                        return '';
                                    }
                                    let datasets = ctx.chart.data.datasets;
                                    if (datasets.indexOf(ctx.dataset) === datasets.length - 1) {
                                        let dataArray: any = datasets[0].data;
                                        let sum = dataArray.reduce((a, b) => a + b, 0);
                                        let percentage = ((value * 100) / sum).toFixed(2) + '%';
                                        return percentage;
                                    } else {
                                        return value;
                                    }
                                },
                                font: {
                                    size: 11
                                },
                                color: '#ffffff',
                                textShadowBlur: 4,
                                textShadowColor: '#111111'
                            }
                        }
                    }
                });
                this.chart.update();
            }
        });
    }
}
