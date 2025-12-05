// models/dashboard.model.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'client_admin' | 'employee';
  clientId?: string;
  allocatedCredits?: number;
  usedCredits?: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  employees: Employee[];
  createdAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  allocatedCredits: number;
  usedCredits: number;
  remainingCredits: number;
  department?: string;
}

export interface CreditTransaction {
  id: string;
  type: 'allocation' | 'usage' | 'revoke';
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
  description: string;
}

export interface DepartmentStats {
  name: string;
  credits: number;
}

export interface Activity {
  type: 'allocation' | 'usage';
  description: string;
  amount: number;
  date: Date;
}