import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignChecklistHeaderComponent } from './campaign-checklist-header.component';

describe('CampaignChecklistHeaderComponent', () => {
    let component: CampaignChecklistHeaderComponent;
    let fixture: ComponentFixture<CampaignChecklistHeaderComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CampaignChecklistHeaderComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CampaignChecklistHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
