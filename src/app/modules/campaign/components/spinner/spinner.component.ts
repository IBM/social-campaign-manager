import { Component } from '@angular/core';

@Component({
    selector: 'spinner',
    template: '<div class="d-flex justify-content-center spinner m-3">'
        + '<i class="fa fa-circle-o-notch fa-spin" aria-hidden="true"></i></div>',
    styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent { }
