// services/dashboard.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, Employee, User, CreditTransaction } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private currentUser = new BehaviorSubject<User | null>(null);
  private clients = new BehaviorSubject<Client[]>([]);
  private transactions = new BehaviorSubject<CreditTransaction[]>([]);

  currentUser$ = this.currentUser.asObservable();
  clients$ = this.clients.asObservable();
  transactions$ = this.transactions.asObservable();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockClients: Client[] = [
      {
        id: 'client_1',
        name: 'Nextloop',
        email: 'admin@nextloop.com',
        totalCredits: 1000,
        usedCredits: 450,
        remainingCredits: 550,
        employees: [
          {
            id: 'emp_1',
            name: 'Piyush Kumar',
            email: 'piyush@nextloop.com',
            allocatedCredits: 200,
            usedCredits: 150,
            remainingCredits: 50,
            department: 'Engineering'
          },
          {
            id: 'emp_2',
            name: 'Ishika Roy',
            email: 'ishika@nextloop.com',
            allocatedCredits: 150,
            usedCredits: 100,
            remainingCredits: 50,
            department: 'Marketing'
          },
          {
            id: 'emp_3',
            name: 'Abhizer Singh',
            email: 'abhizer@nextloop.com',
            allocatedCredits: 100,
            usedCredits: 50,
            remainingCredits: 50,
            department: 'Sales'
          },
          {
            id: 'emp_4',
            name: 'Sarah khan',
            email: 'sarah@nextloop.com',
            allocatedCredits: 0,
            usedCredits: 0,
            remainingCredits: 0,
            department: 'HR'
          }
        ],
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'client_2',
        name: 'TechCorp',
        email: 'admin@techcorp.com',
        totalCredits: 500,
        usedCredits: 200,
        remainingCredits: 300,
        employees: [
          {
            id: 'emp_5',
            name: 'Robert Brown',
            email: 'robert@techcorp.com',
            allocatedCredits: 100,
            usedCredits: 80,
            remainingCredits: 20,
            department: 'Development'
          },
          {
            id: 'emp_6',
            name: 'Emily Davis',
            email: 'emily@techcorp.com',
            allocatedCredits: 100,
            usedCredits: 70,
            remainingCredits: 30,
            department: 'Design'
          }
        ],
        createdAt: new Date('2024-02-10')
      }
    ];

    this.clients.next(mockClients);
  }

  setCurrentUser(user: User) {
    this.currentUser.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  getClients(): Client[] {
    return this.clients.value;
  }

  getClientById(clientId: string): Client | undefined {
    return this.clients.value.find(c => c.id === clientId);
  }

  allocateCreditsToClient(clientId: string, credits: number): boolean {
    const clients = this.clients.value;
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      client.totalCredits += credits;
      client.remainingCredits += credits;
      this.clients.next([...clients]);
      
      // Add transaction
      this.addTransaction({
        id: `txn_${Date.now()}`,
        type: 'allocation',
        from: 'Arthnext',
        to: client.name,
        amount: credits,
        timestamp: new Date(),
        description: `Allocated ${credits} credits to ${client.name}`
      });
      
      return true;
    }
    return false;
  }

  allocateCreditsToEmployee(clientId: string, employeeId: string, credits: number): boolean {
    const clients = this.clients.value;
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      const employee = client.employees.find(e => e.id === employeeId);
      
      if (employee && client.remainingCredits >= credits) {
        employee.allocatedCredits += credits;
        employee.remainingCredits += credits;
        client.usedCredits += credits;
        client.remainingCredits -= credits;
        this.clients.next([...clients]);
        
        // Add transaction
        this.addTransaction({
          id: `txn_${Date.now()}`,
          type: 'allocation',
          from: client.name,
          to: employee.name,
          amount: credits,
          timestamp: new Date(),
          description: `Allocated ${credits} credits to ${employee.name}`
        });
        
        return true;
      }
    }
    return false;
  }

  useCredits(clientId: string, employeeId: string, credits: number, description?: string): boolean {
    const clients = this.clients.value;
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      const employee = client.employees.find(e => e.id === employeeId);
      
      if (employee && employee.remainingCredits >= credits) {
        employee.usedCredits += credits;
        employee.remainingCredits -= credits;
        this.clients.next([...clients]);
        
        // Add transaction
        this.addTransaction({
          id: `txn_${Date.now()}`,
          type: 'usage',
          from: employee.name,
          to: 'System',
          amount: credits,
          timestamp: new Date(),
          description: description || `Used ${credits} credits`
        });
        
        return true;
      }
    }
    return false;
  }

  private addTransaction(transaction: CreditTransaction) {
    const transactions = this.transactions.value;
    transactions.unshift(transaction);
    this.transactions.next([...transactions]);
  }

  getTransactionHistory(): CreditTransaction[] {
    return this.transactions.value;
  }

  addNewClient(name: string, email: string): void {
    const clients = this.clients.value;
    const newClient: Client = {
      id: `client_${Date.now()}`,
      name,
      email,
      totalCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      employees: [],
      createdAt: new Date()
    };
    clients.push(newClient);
    this.clients.next([...clients]);
  }

  addNewEmployee(clientId: string, name: string, email: string, department: string): boolean {
    const clients = this.clients.value;
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      const newEmployee: Employee = {
        id: `emp_${Date.now()}`,
        name,
        email,
        allocatedCredits: 0,
        usedCredits: 0,
        remainingCredits: 0,
        department
      };
      client.employees.push(newEmployee);
      this.clients.next([...clients]);
      return true;
    }
    return false;
  }
}