// components/user-dashboard/user-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../shared/services/dashboard.service';
import { User, Transaction, CreditBalance } from '../../shared/models/dashboard.model';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-dashboard.component.html',
    styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {
    user: User | null = null;
    transactions: Transaction[] = [];
    selectedMonth: string = '';
    availableMonths: string[] = [];
    serviceDescription = '';
    serviceSuccess = false;
    serviceError = '';

    constructor(private dashboardService: DashboardService) { }

    ngOnInit() {
        this.dashboardService.clients$.subscribe(clients => {
            // Get the first user of first client (in real app, filter by logged-in user)
            if (clients.length > 0 && clients[0].users.length > 0) {
                this.user = clients[0].users[0];
                this.loadTransactions();
                this.generateAvailableMonths();
            }
        });
    }

    loadTransactions() {
        if (this.user) {
            this.transactions = this.dashboardService.getTransactionHistory(
                this.user.id,
                this.selectedMonth || undefined
            );
        }
    }

    generateAvailableMonths() {
        const months = new Set<string>();
        const allTransactions = this.dashboardService.getTransactionHistory(this.user?.id);
        allTransactions.forEach(t => months.add(t.month));
        this.availableMonths = Array.from(months).sort().reverse();
        if (this.availableMonths.length > 0 && !this.selectedMonth) {
            this.selectedMonth = this.availableMonths[0];
        }
    }

    onMonthChange() {
        this.loadTransactions();
    }

    // Service Usage - 1 credit per call
    useService() {
        if (!this.user) return;

        const success = this.dashboardService.useService(
            this.user.id,
            this.serviceDescription || 'Service call'
        );

        if (success) {
            this.serviceSuccess = true;
            this.serviceError = '';
            this.serviceDescription = '';
            this.loadTransactions();

            setTimeout(() => {
                this.serviceSuccess = false;
            }, 3000);
        } else {
            this.serviceError = 'No credits available. Please contact your admin.';
            setTimeout(() => {
                this.serviceError = '';
            }, 3000);
        }
    }

    // Credit Information
    getTotalCredits(): number {
        if (!this.user) return 0;
        // Show free credits only - paid are unlimited
        return this.user.freeCredits;
    }

    getFreeCreditsPercentage(): number {
        if (!this.user) return 0;
        return (this.user.freeCredits / 50) * 100;
    }

    getUsagePercentage(): number {
        if (!this.user) return 0;
        // Usage percentage based on free credits only
        return (this.user.freeCreditsUsed / 50) * 100;
    }

    getStatus(): string {
        const total = this.getTotalCredits();
        if (total > 30) return 'Active';
        if (total > 10) return 'Low Credits';
        return 'Critical';
    }

    getStatusClass(): string {
        const total = this.getTotalCredits();
        if (total > 30) return 'bg-green-100 text-green-800';
        if (total > 10) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    }

    // Transaction Statistics
    getMonthlyFreeCreditsUsed(): number {
        return this.transactions.filter(t => t.type === 'free').length;
    }

    getMonthlyPaidCreditsUsed(): number {
        return this.transactions.filter(t => t.type === 'paid').length;
    }

    getMonthName(monthStr: string): string {
        if (!monthStr) return 'All Time';
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    getDaysUntilRefill(): number {
        // Calculate days until next month
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const diff = nextMonth.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    formatCurrency(amount: number): string {
        return `$${amount.toFixed(2)}`;
    }
}
