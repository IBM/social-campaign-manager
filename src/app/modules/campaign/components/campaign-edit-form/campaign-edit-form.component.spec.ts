import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignEditFormComponent } from './campaign-edit-form.component';

describe('CampaignEditFormComponent', () => {
    let component: CampaignEditFormComponent;
    let fixture: ComponentFixture<CampaignEditFormComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CampaignEditFormComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CampaignEditFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
