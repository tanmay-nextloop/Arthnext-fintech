import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfSignComponent } from './pdf-sign.component';

describe('PdfSignComponent', () => {
  let component: PdfSignComponent;
  let fixture: ComponentFixture<PdfSignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfSignComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfSignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
