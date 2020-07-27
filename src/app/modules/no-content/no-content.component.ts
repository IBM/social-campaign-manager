import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'no-content',
    template: 'Redirect to main page'
})
export class NoContentComponent {

    constructor(private router: Router) {
        this.router.navigateByUrl('/chat');
    }
}
