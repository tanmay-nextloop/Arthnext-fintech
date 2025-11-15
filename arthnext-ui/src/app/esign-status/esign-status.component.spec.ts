import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EsignStatusComponent } from './esign-status.component';

describe('EsignStatusComponent', () => {
  let component: EsignStatusComponent;
  let fixture: ComponentFixture<EsignStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EsignStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EsignStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
