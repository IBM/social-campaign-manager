import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignCreateDraftComponent } from './campaign-create-draft.component';

describe('CampaignCreateDraftComponent', () => {
    let component: CampaignCreateDraftComponent;
    let fixture: ComponentFixture<CampaignCreateDraftComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CampaignCreateDraftComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CampaignCreateDraftComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
