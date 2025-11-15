import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultisignatureComponent } from './multisignature.component';

describe('MultisignatureComponent', () => {
  let component: MultisignatureComponent;
  let fixture: ComponentFixture<MultisignatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultisignatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultisignatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
