// components/super-admin-dashboard/super-admin-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../shared/services/dashboard.service';
import { Client } from '../../shared/models/dashboard.model';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  clients: Client[] = [];
  selectedClientId = '';
  creditsToAllocate: number | null = null;
  showAddClientModal = false;
  newClientName = '';
  newClientEmail = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.clients$.subscribe(clients => {
      this.clients = clients;
    });
  }

  getTotalAllocated(): number {
    return this.clients.reduce((sum, client) => sum + client.totalCredits, 0);
  }

  getTotalUsed(): number {
    return this.clients.reduce((sum, client) => sum + client.usedCredits, 0);
  }

  getTotalRemaining(): number {
    return this.clients.reduce((sum, client) => sum + client.remainingCredits, 0);
  }

  allocateCredits() {
    if (this.selectedClientId && this.creditsToAllocate && this.creditsToAllocate > 0) {
      const success = this.dashboardService.allocateCreditsToClient(
        this.selectedClientId,
        this.creditsToAllocate
      );
      
      if (success) {
        alert(`Successfully allocated ${this.creditsToAllocate} credits!`);
        this.selectedClientId = '';
        this.creditsToAllocate = null;
      }
    }
  }

  addNewClient() {
    if (this.newClientName && this.newClientEmail) {
      this.dashboardService.addNewClient(this.newClientName, this.newClientEmail);
      this.showAddClientModal = false;
      this.newClientName = '';
      this.newClientEmail = '';
    }
  }

  getUsagePercentage(client: Client): number {
    if (client.totalCredits === 0) return 0;
    return (client.usedCredits / client.totalCredits) * 100;
  }

  getStatusClass(client: Client): string {
    if (client.remainingCredits > 300) return 'bg-green-100 text-green-800';
    if (client.remainingCredits > 100) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getStatusText(client: Client): string {
    if (client.remainingCredits > 300) return 'Healthy';
    if (client.remainingCredits > 100) return 'Warning';
    return 'Critical';
  }
}