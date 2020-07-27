/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

@Component({
    selector: 'bar-chart',
    templateUrl: './bar-chart.component.html',
    styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements AfterViewInit {
    @ViewChild('barChart', { read: ElementRef }) private chartRef: ElementRef;
    chart: any;

    @Input()
    data: any = null;

    @Input()
    displayLegend: boolean = true;

    ngAfterViewInit() {
        setTimeout(() => {
            if (this.data) {
                this.trimDataLabels();
                this.chart = new Chart(this.chartRef.nativeElement, {
                    type: 'bar',
                    data: this.data,
                    plugins: [ChartDataLabels],
                    options: {
                        scales: {
                            yAxes: [{
                                display: true,
                                ticks: {
                                    beginAtZero: true,
                                    min: 0
                                }
                            }]
                        },
                        responsive: true,
                        legend: {
                            display: this.displayLegend,
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

    trimDataLabels() {
        if (this.data && this.data.labels && this.data.labels.length) {
            this.data.labels = this.data.labels.map((label) => {
                const limit = 20;
                if (label && label.length > limit) {
                    return label.trim().substr(0, limit) + '...';
                } else {
                    return label;
                }
            });
        }
    }
}
