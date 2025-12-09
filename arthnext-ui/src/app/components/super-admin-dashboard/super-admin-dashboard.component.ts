// components/super-admin-dashboard/super-admin-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../shared/services/dashboard.service';
import { Client, User } from '../../shared/models/dashboard.model';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  clients: Client[] = [];
  expandedClients: Set<string> = new Set();
  showAddClientModal = false;
  newClientName = '';
  newClientEmail = '';

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.clients$.subscribe(clients => {
      this.clients = clients;
    });
  }

  // Revenue and Statistics
  getTotalRevenue(): number {
    return this.dashboardService.getTotalRevenue();
  }

  getTotalUsers(): number {
    return this.clients.reduce((sum, client) => sum + client.users.length, 0);
  }

  getCurrentMonthRevenue(): number {
    return this.clients.reduce((sum, client) => sum + client.currentMonthBill, 0);
  }

  // Client Management
  toggleClientExpansion(clientId: string) {
    if (this.expandedClients.has(clientId)) {
      this.expandedClients.delete(clientId);
    } else {
      this.expandedClients.add(clientId);
    }
  }

  isClientExpanded(clientId: string): boolean {
    return this.expandedClients.has(clientId);
  }

  addNewClient() {
    if (this.newClientName && this.newClientEmail) {
      this.dashboardService.addNewClient(this.newClientName, this.newClientEmail);
      this.showAddClientModal = false;
      this.newClientName = '';
      this.newClientEmail = '';
    }
  }

  // User Statistics per Client
  getUserCountForClient(client: Client): number {
    return client.users.length;
  }

  getTotalCreditsUsedByClient(client: Client): number {
    return client.users.reduce((sum, user) => sum + user.totalUsed, 0);
  }

  getPaidCreditsUsedByClient(client: Client): number {
    return client.users.reduce((sum, user) => sum + user.paidCreditsUsed, 0);
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

  getClientStatusClass(client: Client): string {
    const avgCredits = client.users.length > 0
      ? client.users.reduce((sum, u) => sum + u.freeCredits + u.paidCredits, 0) / client.users.length
      : 0;
    if (avgCredits > 30) return 'bg-green-100 text-green-800';
    if (avgCredits > 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getClientStatusText(client: Client): string {
    const avgCredits = client.users.length > 0
      ? client.users.reduce((sum, u) => sum + u.freeCredits + u.paidCredits, 0) / client.users.length
      : 0;
    if (avgCredits > 30) return 'Healthy';
    if (avgCredits > 10) return 'Warning';
    return 'Needs Attention';
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}
