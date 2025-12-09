// services/dashboard.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, User, Transaction, Invoice, UserBilling, CreditBalance } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private currentUser = new BehaviorSubject<User | null>(null);
  private clients = new BehaviorSubject<Client[]>([]);
  private transactions = new BehaviorSubject<Transaction[]>([]);
  private invoices = new BehaviorSubject<Invoice[]>([]);

  currentUser$ = this.currentUser.asObservable();
  clients$ = this.clients.asObservable();
  transactions$ = this.transactions.asObservable();
  invoices$ = this.invoices.asObservable();

  private readonly CREDIT_PRICE = 0.10; // $0.10 per credit
  private readonly TAX_RATE = 0.18; // 18% GST
  private readonly FREE_CREDITS = 50; // Each user gets 50 free credits

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockClients: Client[] = [
      {
        id: 'client_1',
        name: 'Nextloop',
        email: 'admin@nextloop.com',
        users: [
          {
            id: 'user_1',
            name: 'Piyush Kumar',
            email: 'piyush@nextloop.com',
            clientId: 'client_1',
            role: 'user',
            freeCredits: 25,
            paidCredits: 100,
            totalUsed: 125,
            freeCreditsUsed: 25,
            paidCreditsUsed: 100,
            department: 'Engineering',
            createdAt: new Date('2024-10-01')
          },
          {
            id: 'user_2',
            name: 'Ishika Roy',
            email: 'ishika@nextloop.com',
            clientId: 'client_1',
            role: 'user',
            freeCredits: 10,
            paidCredits: 50,
            totalUsed: 90,
            freeCreditsUsed: 40,
            paidCreditsUsed: 50,
            department: 'Marketing',
            createdAt: new Date('2024-10-05')
          },
          {
            id: 'user_3',
            name: 'Abhizer Singh',
            email: 'abhizer@nextloop.com',
            clientId: 'client_1',
            role: 'user',
            freeCredits: 30,
            paidCredits: 20,
            totalUsed: 40,
            freeCreditsUsed: 20,
            paidCreditsUsed: 20,
            department: 'Sales',
            createdAt: new Date('2024-10-10')
          },
          {
            id: 'user_4',
            name: 'Sarah Khan',
            email: 'sarah@nextloop.com',
            clientId: 'client_1',
            role: 'client_admin',
            freeCredits: 50,
            paidCredits: 0,
            totalUsed: 0,
            freeCreditsUsed: 0,
            paidCreditsUsed: 0,
            department: 'HR',
            createdAt: new Date('2024-11-01')
          }
        ],
        currentMonthBill: 17.0, // 170 paid credits * $0.10
        totalRevenue: 250.0,
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'client_2',
        name: 'TechCorp',
        email: 'admin@techcorp.com',
        users: [
          {
            id: 'user_5',
            name: 'Robert Brown',
            email: 'robert@techcorp.com',
            clientId: 'client_2',
            role: 'user',
            freeCredits: 5,
            paidCredits: 80,
            totalUsed: 125,
            freeCreditsUsed: 45,
            paidCreditsUsed: 80,
            department: 'Development',
            createdAt: new Date('2024-09-15')
          },
          {
            id: 'user_6',
            name: 'Emily Davis',
            email: 'emily@techcorp.com',
            clientId: 'client_2',
            role: 'user',
            freeCredits: 20,
            paidCredits: 30,
            totalUsed: 60,
            freeCreditsUsed: 30,
            paidCreditsUsed: 30,
            department: 'Design',
            createdAt: new Date('2024-09-20')
          }
        ],
        currentMonthBill: 11.0, // 110 paid credits * $0.10
        totalRevenue: 180.0,
        createdAt: new Date('2024-02-10')
      }
    ];

    this.clients.next(mockClients);
    this.generateMockTransactions();
    this.generateMockInvoices();
  }

  private generateMockTransactions() {
    const transactions: Transaction[] = [
      {
        id: 'txn_1',
        userId: 'user_1',
        userName: 'Piyush Kumar',
        clientId: 'client_1',
        type: 'free',
        amount: 1,
        description: 'API call - Document signing',
        timestamp: new Date('2024-12-08T10:30:00'),
        month: '2024-12'
      },
      {
        id: 'txn_2',
        userId: 'user_1',
        userName: 'Piyush Kumar',
        clientId: 'client_1',
        type: 'paid',
        amount: 1,
        description: 'API call - Data processing',
        timestamp: new Date('2024-12-08T14:20:00'),
        month: '2024-12'
      },
      {
        id: 'txn_3',
        userId: 'user_2',
        userName: 'Ishika Roy',
        clientId: 'client_1',
        type: 'free',
        amount: 1,
        description: 'API call - Email service',
        timestamp: new Date('2024-12-07T09:15:00'),
        month: '2024-12'
      }
    ];
    this.transactions.next(transactions);
  }

  private generateMockInvoices() {
    const invoices: Invoice[] = [
      {
        id: 'inv_1',
        clientId: 'client_1',
        clientName: 'Nextloop',
        month: '2024-11',
        year: 2024,
        monthName: 'November 2024',
        userBreakdown: [
          { userId: 'user_1', userName: 'Piyush Kumar', freeCreditsUsed: 25, paidCreditsUsed: 100, amount: 10.0 },
          { userId: 'user_2', userName: 'Ishika Roy', freeCreditsUsed: 40, paidCreditsUsed: 50, amount: 5.0 },
          { userId: 'user_3', userName: 'Abhizer Singh', freeCreditsUsed: 20, paidCreditsUsed: 20, amount: 2.0 }
        ],
        subtotal: 17.0,
        tax: 3.06,
        total: 20.06,
        generatedAt: new Date('2024-12-01'),
        dueDate: new Date('2024-12-15'),
        status: 'sent'
      }
    ];
    this.invoices.next(invoices);
  }

  // User Management
  setCurrentUser(user: User) {
    this.currentUser.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  // Client Management
  getClients(): Client[] {
    return this.clients.value;
  }

  getClientById(clientId: string): Client | undefined {
    return this.clients.value.find(c => c.id === clientId);
  }

  addNewClient(name: string, email: string): void {
    const clients = this.clients.value;
    const newClient: Client = {
      id: `client_${Date.now()}`,
      name,
      email,
      users: [],
      currentMonthBill: 0,
      totalRevenue: 0,
      createdAt: new Date()
    };
    clients.push(newClient);
    this.clients.next([...clients]);
  }

  // User Management (replaces Employee)
  addNewUser(clientId: string, name: string, email: string, department: string, role: 'user' | 'client_admin' = 'user'): boolean {
    const clients = this.clients.value;
    const client = clients.find(c => c.id === clientId);

    if (client) {
      const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        email,
        clientId,
        role,
        freeCredits: this.FREE_CREDITS,  // Auto-assign 50 free credits
        paidCredits: 0,
        totalUsed: 0,
        freeCreditsUsed: 0,
        paidCreditsUsed: 0,
        department,
        createdAt: new Date()
      };
      client.users.push(newUser);
      this.clients.next([...clients]);
      return true;
    }
    return false;
  }

  getUserById(userId: string): User | undefined {
    const clients = this.clients.value;
    for (const client of clients) {
      const user = client.users.find(u => u.id === userId);
      if (user) return user;
    }
    return undefined;
  }

  // Credit Usage - 1 credit per service call
  useService(userId: string, description: string = 'Service call'): boolean {
    const clients = this.clients.value;
    let user: User | undefined;
    let client: Client | undefined;

    // Find user and their client
    for (const c of clients) {
      const u = c.users.find(u => u.id === userId);
      if (u) {
        user = u;
        client = c;
        break;
      }
    }

    if (!user || !client) return false;

    // Check if user has any credits available
    if (user.freeCredits <= 0 && user.paidCredits <= 0) {
      return false; // No credits available
    }

    const currentMonth = this.getCurrentMonth();
    let creditType: 'free' | 'paid';

    // Use free credits first, then paid
    if (user.freeCredits > 0) {
      user.freeCredits -= 1;
      user.freeCreditsUsed += 1;
      creditType = 'free';
    } else {
      user.paidCredits -= 1;
      user.paidCreditsUsed += 1;
      creditType = 'paid';

      // Update client's monthly bill (only for paid credits)
      client.currentMonthBill += this.CREDIT_PRICE;
      client.totalRevenue += this.CREDIT_PRICE;
    }

    user.totalUsed += 1;

    // Add transaction
    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      clientId: client.id,
      type: creditType,
      amount: 1,
      description,
      timestamp: new Date(),
      month: currentMonth
    };

    const transactions = this.transactions.value;
    transactions.unshift(transaction);
    this.transactions.next([...transactions]);

    this.clients.next([...clients]);
    return true;
  }

  // Add paid credits to a user (for testing or manual allocation)
  addPaidCredits(userId: string, amount: number): boolean {
    const clients = this.clients.value;
    for (const client of clients) {
      const user = client.users.find(u => u.id === userId);
      if (user) {
        user.paidCredits += amount;
        this.clients.next([...clients]);
        return true;
      }
    }
    return false;
  }

  // Transaction History
  getTransactionHistory(userId?: string, month?: string): Transaction[] {
    let transactions = this.transactions.value;

    if (userId) {
      transactions = transactions.filter(t => t.userId === userId);
    }

    if (month) {
      transactions = transactions.filter(t => t.month === month);
    }

    return transactions;
  }

  // Invoice Management
  getInvoices(clientId?: string): Invoice[] {
    let invoices = this.invoices.value;

    if (clientId) {
      invoices = invoices.filter(i => i.clientId === clientId);
    }

    return invoices;
  }

  generateMonthlyInvoice(clientId: string, month: string): Invoice | null {
    const client = this.getClientById(clientId);
    if (!client) return null;

    const userBreakdown: UserBilling[] = [];
    let subtotal = 0;

    // Calculate billing for each user
    for (const user of client.users) {
      const userTransactions = this.getTransactionHistory(user.id, month);
      const paidCreditsUsed = userTransactions.filter(t => t.type === 'paid').length;
      const freeCreditsUsed = userTransactions.filter(t => t.type === 'free').length;

      if (paidCreditsUsed > 0 || freeCreditsUsed > 0) {
        const amount = paidCreditsUsed * this.CREDIT_PRICE;
        userBreakdown.push({
          userId: user.id,
          userName: user.name,
          freeCreditsUsed,
          paidCreditsUsed,
          amount
        });
        subtotal += amount;
      }
    }

    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    const [year, monthNum] = month.split('-');
    const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1);
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      clientId,
      clientName: client.name,
      month,
      year: parseInt(year),
      monthName,
      userBreakdown,
      subtotal,
      tax,
      total,
      generatedAt: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), // 15 days from now
      status: 'draft'
    };

    const invoices = this.invoices.value;
    invoices.unshift(invoice);
    this.invoices.next([...invoices]);

    return invoice;
  }

  // Utility Methods
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  getCreditBalance(userId: string): CreditBalance | null {
    const user = this.getUserById(userId);
    if (!user) return null;

    return {
      freeCredits: user.freeCredits,
      paidCredits: user.paidCredits,
      totalCredits: user.freeCredits + user.paidCredits,
      freeCreditsUsed: user.freeCreditsUsed,
      paidCreditsUsed: user.paidCreditsUsed,
      totalUsed: user.totalUsed
    };
  }

  // Calculate total revenue across all clients
  getTotalRevenue(): number {
    return this.clients.value.reduce((sum, client) => sum + client.totalRevenue, 0);
  }

  // Calculate current month bill for a client
  calculateClientBill(clientId: string): number {
    const client = this.getClientById(clientId);
    if (!client) return 0;
    return client.currentMonthBill;
  }
}
