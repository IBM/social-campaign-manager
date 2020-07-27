import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { PieChartComponent } from './pie-chart/pie-chart.component';
import { BarChartComponent } from './bar-chart/bar-chart.component';


@NgModule({
    imports: [
        CommonModule,
        NgbModule
    ],
    declarations: [
        PieChartComponent,
        BarChartComponent
    ],
    exports: [
        PieChartComponent,
        BarChartComponent
    ]
})

export class ChartJsModule { }
