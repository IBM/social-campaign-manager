import { Component, Input } from '@angular/core';

@Component({
    selector: 'tabs',
    template: `
            <ul class="nav nav-tabs border-bottom-0 mt-3">
                <li class="nav-item" *ngFor="let tab of tabs" (click)="selectTab(tab)">
                    <a class="nav-link" [ngClass]="tab.active ? 'active' : ''" routerLink=".">{{ tab.tabTitle }}</a>
                </li>
            </ul>

        <div class="row border">
          <div class="col">
            <ng-content></ng-content>
          </div>
        </div>
    `
})
export class TabsComponent {
    tabs: Tab[] = [];

    selectTab(tab: Tab) {
        this.tabs.forEach((tab) => {
            tab.active = false;
        });
        tab.active = true;
    }

    addTab(tab: Tab) {
        if (this.tabs.length === 0) {
            tab.active = true;
        }
        this.tabs.push(tab);
    }
}

@Component({
    selector: 'tab',
    template: `
        <div [hidden]="!active">
            <ng-content></ng-content>
        </div>
    `
})
export class Tab {
    @Input() tabTitle: string;
    @Input() active = false;

    constructor(tabs: TabsComponent) {
        tabs.addTab(this);
    }
}
