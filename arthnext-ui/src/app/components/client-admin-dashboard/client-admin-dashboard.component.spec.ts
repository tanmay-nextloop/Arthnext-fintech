import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientAdminDashboardComponent } from './client-admin-dashboard.component';

describe('ClientAdminDashboardComponent', () => {
  let component: ClientAdminDashboardComponent;
  let fixture: ComponentFixture<ClientAdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientAdminDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientAdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
