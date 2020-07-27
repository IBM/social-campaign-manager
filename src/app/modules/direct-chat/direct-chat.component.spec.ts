import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectChatComponent } from './direct-chat.component';

describe('DirectChatComponent', () => {
    let component: DirectChatComponent;
    let fixture: ComponentFixture<DirectChatComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DirectChatComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DirectChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
