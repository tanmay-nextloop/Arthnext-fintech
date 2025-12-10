// components/dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../shared/services/dashboard.service'
import { SuperAdminDashboardComponent } from '../components/super-admin-dashboard/super-admin-dashboard.component';
import { ClientAdminDashboardComponent } from '../components/client-admin-dashboard/client-admin-dashboard.component';
import { UserDashboardComponent } from '../components/user-dashboard/user-dashboard.component';
import { User } from '../shared/models/dashboard.model';
import { AuthService } from '../service/Auth/auth.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SuperAdminDashboardComponent,
    ClientAdminDashboardComponent,
    UserDashboardComponent
  ],
  template: `
    <div>
      <!-- Role Switcher for Demo (Remove in production) -->
      <div class="bg-gray-800 text-white p-4 flex justify-center gap-4">
        <button
          (click)="switchRole('super_admin')"
          [class.bg-blue-600]="userRole === 'super_admin'"
          [class.bg-gray-600]="userRole !== 'super_admin'"
          class="px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Super Admin (Arthnext)
        </button>
        <button
          (click)="switchRole('client_admin')"
          [class.bg-green-600]="userRole === 'client_admin'"
          [class.bg-gray-600]="userRole !== 'client_admin'"
          class="px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Client Admin (Nextloop)
        </button>
        <button
          (click)="switchRole('user')"
          [class.bg-purple-600]="userRole === 'user'"
          [class.bg-gray-600]="userRole !== 'user'"
          class="px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          User (Piyush Kumar)
        </button>
      </div>

      <!-- Dashboard Content -->
      <app-super-admin-dashboard *ngIf="userRole === 'super_admin'"></app-super-admin-dashboard>
      <app-client-admin-dashboard *ngIf="userRole === 'client_admin'"></app-client-admin-dashboard>
      <app-user-dashboard *ngIf="userRole === 'user'"></app-user-dashboard>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  userRole: 'super_admin' | 'client_admin' | 'user' = 'super_admin';

  constructor(private dashboardService: DashboardService, private authService: AuthService,) { }

  ngOnInit() {
    // In production, get user role from AuthService
    // const currentUser = this.authService.getCurrentUser();
    // this.userRole = currentUser.role;

    // this.userRole = 'super_admin';
    const currentUser = this.authService.getCurrentUser();
    this.userRole = this.authService.getUserRole() || 'super_admin';
  }

  switchRole(role: 'super_admin' | 'client_admin' | 'user') {
    this.userRole = role;

    // Mock user data based on role
    const mockUser: User = {
      id: role === 'super_admin' ? 'admin_1' : role === 'client_admin' ? 'client_admin_1' : 'user_1',
      name: role === 'super_admin' ? 'Arthnext Admin' : role === 'client_admin' ? 'Nextloop Admin' : 'Piyush Kumar',
      email: role === 'super_admin' ? 'admin@arthnext.com' : role === 'client_admin' ? 'admin@nextloop.com' : 'piyush@nextloop.com',
      role: role,
      clientId: role !== 'super_admin' ? 'client_1' : 'client_1',
      freeCredits: role === 'user' ? 25 : 50,
      totalUsed: role === 'user' ? 125 : 0,
      freeCreditsUsed: role === 'user' ? 25 : 0,
      paidCreditsUsed: role === 'user' ? 100 : 0,
      department: role === 'user' ? 'Engineering' : undefined,
      createdAt: new Date()
    };

    this.dashboardService.setCurrentUser(mockUser);
  }
}