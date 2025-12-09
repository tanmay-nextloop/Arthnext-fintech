// components/client-admin-dashboard/client-admin-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../shared/services/dashboard.service';
import { Client, User, DepartmentStats, Invoice } from '../../shared/models/dashboard.model';

@Component({
  selector: 'app-client-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-admin-dashboard.component.html',
  styleUrls: ['./client-admin-dashboard.component.scss']
})
export class ClientAdminDashboardComponent implements OnInit {
  client: Client | null = null;
  invoices: Invoice[] = [];
  showAddUserModal = false;
  showInvoiceModal = false;
  selectedInvoice: Invoice | null = null;
  newUserName = '';
  newUserEmail = '';
  newUserDepartment = '';

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.clients$.subscribe(clients => {
      // Get the first client (in real app, filter by logged-in user's clientId)
      this.client = clients[0] || null;
      if (this.client) {
        this.loadInvoices();
      }
    });
  }

  loadInvoices() {
    if (this.client) {
      this.invoices = this.dashboardService.getInvoices(this.client.id);
    }
  }

  // User Management - Auto assigns 50 free credits
  addNewUser() {
    if (this.client && this.newUserName && this.newUserEmail && this.newUserDepartment) {
      const success = this.dashboardService.addNewUser(
        this.client.id,
        this.newUserName,
        this.newUserEmail,
        this.newUserDepartment,
        'user'
      );

      if (success) {
        this.showAddUserModal = false;
        this.newUserName = '';
        this.newUserEmail = '';
        this.newUserDepartment = '';
      }
    }
  }

  closeModal() {
    this.showAddUserModal = false;
    this.showInvoiceModal = false;
  }

  // Billing and Invoice Methods
  getMonthlyBill(): number {
    return this.client?.currentMonthBill || 0;
  }

  getMonthlyBillWithTax(): number {
    const subtotal = this.getMonthlyBill();
    const tax = subtotal * 0.18; // 18% GST
    return subtotal + tax;
  }

  viewInvoice(invoice: Invoice) {
    this.selectedInvoice = invoice;
    this.showInvoiceModal = true;
  }

  downloadInvoice(invoice: Invoice) {
    // In a real app, this would generate and download a PDF
    alert(`Downloading invoice ${invoice.id} for ${invoice.monthName}`);
  }

  // Statistics
  getTotalUsers(): number {
    return this.client?.users.length || 0;
  }

  getTotalFreeCreditsUsed(): number {
    if (!this.client) return 0;
    return this.client.users.reduce((sum, user) => sum + user.freeCreditsUsed, 0);
  }

  getTotalPaidCreditsUsed(): number {
    if (!this.client) return 0;
    return this.client.users.reduce((sum, user) => sum + user.paidCreditsUsed, 0);
  }

  getTotalCreditsUsed(): number {
    if (!this.client) return 0;
    return this.client.users.reduce((sum, user) => sum + user.totalUsed, 0);
  }

  // Department Statistics
  getDepartmentStats(): DepartmentStats[] {
    if (!this.client) return [];
    const deptMap = new Map<string, { userCount: number, totalUsed: number, paidUsed: number }>();

    this.client.users.forEach(user => {
      const dept = user.department || 'Other';
      const current = deptMap.get(dept) || { userCount: 0, totalUsed: 0, paidUsed: 0 };
      current.userCount += 1;
      current.totalUsed += user.totalUsed;
      current.paidUsed += user.paidCreditsUsed;
      deptMap.set(dept, current);
    });

    return Array.from(deptMap.entries()).map(([name, stats]) => ({
      name,
      userCount: stats.userCount,
      totalCreditsUsed: stats.totalUsed,
      paidCreditsUsed: stats.paidUsed
    }));
  }

  getAveragePerUser(): number {
    if (!this.client || this.client.users.length === 0) return 0;
    return Math.round(this.getTotalCreditsUsed() / this.client.users.length);
  }

  getMostActiveUser(): string {
    if (!this.client || this.client.users.length === 0) return 'N/A';
    const max = this.client.users.reduce((prev, current) =>
      prev.totalUsed > current.totalUsed ? prev : current
    );
    return max.name;
  }

  // User Display Methods
  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getUserStatusClass(user: User): string {
    const totalCredits = user.freeCredits + user.paidCredits;
    if (totalCredits > 30) return 'bg-green-100 text-green-800';
    if (totalCredits > 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getUserStatusText(user: User): string {
    const totalCredits = user.freeCredits + user.paidCredits;
    if (totalCredits > 30) return 'Active';
    if (totalCredits > 10) return 'Low';
    return 'Critical';
  }

  getInvoiceStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  // Helper method for template - calculate total paid credits in invoice
  getInvoicePaidCreditsTotal(invoice: Invoice): number {
    return invoice.userBreakdown.reduce((sum, u) => sum + u.paidCreditsUsed, 0);
  }
}