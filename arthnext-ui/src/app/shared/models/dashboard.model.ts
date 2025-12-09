// models/dashboard.model.ts

// User role types
export type UserRole = 'super_admin' | 'client_admin' | 'user';

// User interface - replaces Employee
export interface User {
  id: string;
  name: string;
  email: string;
  clientId: string;
  role: UserRole;
  freeCredits: number;        // Max 50, starts at 50
  paidCredits: number;        // Unlimited, starts at 0
  totalUsed: number;          // Total credits used (free + paid)
  freeCreditsUsed: number;    // How many free credits used
  paidCreditsUsed: number;    // How many paid credits used
  department?: string;
  createdAt: Date;
}

// Client interface - company account (doesn't use credits)
export interface Client {
  id: string;
  name: string;
  email: string;
  users: User[];
  currentMonthBill: number;   // Total paid credits used this month * $0.10
  totalRevenue: number;       // All-time revenue
  createdAt: Date;
}

// User billing breakdown for invoices
export interface UserBilling {
  userId: string;
  userName: string;
  freeCreditsUsed: number;
  paidCreditsUsed: number;
  amount: number;             // paidCreditsUsed * $0.10
}

// Monthly invoice for client
export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  month: string;              // "2024-11" format
  year: number;
  monthName: string;          // "November 2024"
  userBreakdown: UserBilling[];
  subtotal: number;           // Total paid credits * $0.10
  tax: number;                // 18% GST
  total: number;              // subtotal + tax
  generatedAt: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

// Transaction record for user credit usage
export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  clientId: string;
  type: 'free' | 'paid';      // Which credit type was used
  amount: number;             // Always 1 for service calls
  description: string;
  timestamp: Date;
  month: string;              // "2024-11" format for filtering
}

// Credit balance summary
export interface CreditBalance {
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  freeCreditsUsed: number;
  paidCreditsUsed: number;
  totalUsed: number;
}

// Department statistics
export interface DepartmentStats {
  name: string;
  userCount: number;
  totalCreditsUsed: number;
  paidCreditsUsed: number;
}

// Activity for user dashboard
export interface Activity {
  type: 'free' | 'paid' | 'initial';
  description: string;
  amount: number;
  date: Date;
  balance: CreditBalance;
}