// components/client-admin-dashboard/client-admin-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../shared/services/dashboard.service';
import { Client, DepartmentStats, Employee }  from '../../shared/models/dashboard.model';

@Component({
  selector: 'app-client-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-admin-dashboard.component.html',
  styleUrls: ['./client-admin-dashboard.component.scss']
})
export class ClientAdminDashboardComponent implements OnInit {
  client: Client | null = null;
  selectedEmployeeId = '';
  creditsToAllocate: number | null = null;
  showAddEmployeeModal = false;
  newEmployeeName = '';
  newEmployeeEmail = '';
  newEmployeeDepartment = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.clients$.subscribe(clients => {
      // Get the first client (in real app, filter by logged-in user's clientId)
      this.client = clients[0] || null;
    });
  }

  allocateToEmployee() {
    if (this.client && this.selectedEmployeeId && this.creditsToAllocate && this.creditsToAllocate > 0) {
      if (this.creditsToAllocate <= this.client.remainingCredits) {
        const success = this.dashboardService.allocateCreditsToEmployee(
          this.client.id,
          this.selectedEmployeeId,
          this.creditsToAllocate
        );
        
        if (success) {
          alert(`Successfully allocated ${this.creditsToAllocate} credits!`);
          this.selectedEmployeeId = '';
          this.creditsToAllocate = null;
        }
      } else {
        alert('Insufficient credits available!');
      }
    }
  }

  getDepartmentStats(): DepartmentStats[] {
    if (!this.client) return [];
    const deptMap = new Map<string, number>();
    
    this.client.employees.forEach(emp => {
      const dept = emp.department || 'Other';
      deptMap.set(dept, (deptMap.get(dept) || 0) + emp.allocatedCredits);
    });
    
    return Array.from(deptMap.entries()).map(([name, credits]) => ({ name, credits }));
  }

  getAveragePerEmployee(): number {
    if (!this.client || this.client.employees.length === 0) return 0;
    return Math.round(this.client.usedCredits / this.client.employees.length);
  }

  getMostAllocatedEmployee(): string {
    if (!this.client || this.client.employees.length === 0) return 'N/A';
    const max = this.client.employees.reduce((prev, current) =>
      prev.allocatedCredits > current.allocatedCredits ? prev : current
    );
    return max.name;
  }

  getTotalUsageRate(): string {
    if (!this.client || this.client.totalCredits === 0) return '0';
    return ((this.client.usedCredits / this.client.totalCredits) * 100).toFixed(1);
  }

  getEmployeeUsagePercentage(employee: Employee): number {
    if (employee.allocatedCredits === 0) return 0;
    return (employee.usedCredits / employee.allocatedCredits) * 100;
  }

  getEmployeeStatusClass(employee: Employee): string {
    const remaining = employee.remainingCredits;
    if (remaining > 50) return 'bg-green-100 text-green-800';
    if (remaining > 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getEmployeeStatusText(employee: Employee): string {
    const remaining = employee.remainingCredits;
    if (remaining > 50) return 'Good';
    if (remaining > 20) return 'Low';
    return 'Critical';
  }

  getUsageBarColor(employee: Employee): string {
    const percentage = this.getEmployeeUsagePercentage(employee);
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getEmployeeInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }

  addNewEmployee() {
    if (this.client && this.newEmployeeName && this.newEmployeeEmail && this.newEmployeeDepartment) {
      const success = this.dashboardService.addNewEmployee(
        this.client.id,
        this.newEmployeeName,
        this.newEmployeeEmail,
        this.newEmployeeDepartment
      );
      
      if (success) {
        this.showAddEmployeeModal = false;
        this.newEmployeeName = '';
        this.newEmployeeEmail = '';
        this.newEmployeeDepartment = '';
      }
    }
  }

  closeModal() {
    this.showAddEmployeeModal = false;
  }
}