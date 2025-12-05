// components/employee-dashboard/employee-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../shared/services/dashboard.service';
import { Employee, Activity } from '../../shared/models/dashboard.model';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit {
  employee: Employee | null = null;
  clientId: string = 'client_1'; // In real app, get from auth service
  creditsToUse: number | null = null;
  usageDescription = '';
  usageSuccess = false;
  
  recentActivities: Activity[] = [
    {
      type: 'allocation',
      description: 'Credits allocated by Admin',
      amount: 200,
      date: new Date(2024, 10, 15)
    },
    {
      type: 'usage',
      description: 'Used for document signing',
      amount: 50,
      date: new Date(2024, 10, 18)
    },
    {
      type: 'usage',
      description: 'Used for API calls',
      amount: 100,
      date: new Date(2024, 10, 19)
    }
  ];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.clients$.subscribe(clients => {
      // Get the first employee of first client (in real app, filter by logged-in user)
      if (clients.length > 0 && clients[0].employees.length > 0) {
        this.employee = clients[0].employees[0];
      }
    });
  }

  getUsagePercentage(): number {
    if (!this.employee || this.employee.allocatedCredits === 0) return 0;
    return Math.round((this.employee.usedCredits / this.employee.allocatedCredits) * 100);
  }

  getStatus(): string {
    const remaining = this.employee?.remainingCredits || 0;
    if (remaining > 50) return 'Active';
    if (remaining > 20) return 'Warning';
    return 'Low Credits';
  }

  getStatusClass(): string {
    const remaining = this.employee?.remainingCredits || 0;
    if (remaining > 50) return 'bg-green-100 text-green-800';
    if (remaining > 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  useCredits() {
    if (this.employee && this.creditsToUse && this.creditsToUse <= this.employee.remainingCredits && this.creditsToUse > 0) {
      const success = this.dashboardService.useCredits(
        this.clientId,
        this.employee.id,
        this.creditsToUse,
        this.usageDescription
      );
      
      if (success) {
        // Add to recent activities
        this.recentActivities.unshift({
          type: 'usage',
          description: this.usageDescription || 'Credit usage',
          amount: this.creditsToUse,
          date: new Date()
        });
        
        this.usageSuccess = true;
        this.creditsToUse = null;
        this.usageDescription = '';
        
        setTimeout(() => {
          this.usageSuccess = false;
        }, 3000);
      }
    }
  }

  getDaysUntilRefill(): number {
    // Calculate days until next month
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const diff = nextMonth.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}