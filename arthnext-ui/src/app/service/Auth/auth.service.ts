// import { Injectable } from '@angular/core'
// import { BehaviorSubject, Observable } from 'rxjs'

// export interface LoginResult {
//   success: boolean
//   emailError?: boolean
//   passwordError?: boolean
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService {
//   private isLoggedInSubject: BehaviorSubject<boolean>

//   constructor() {
//     const initialLoggedInState = localStorage.getItem('isLoggedIn') === 'true'
//     this.isLoggedInSubject = new BehaviorSubject<boolean>(initialLoggedInState)
//   }

//   get isLoggedIn$(): Observable<boolean> {
//     return this.isLoggedInSubject.asObservable()
//   }

//   login(email: string, password: string): LoginResult {
//     const validEmail = 'admin@gmail.com'
//     const validPassword = '12345678'

//     const result: LoginResult = {
//       success: false,
//       emailError: email !== validEmail,
//       passwordError: password !== validPassword,
//     }

//     if (!result.emailError && !result.passwordError) {
//       result.success = true
//       this.setLoggedIn(true)
//     }

//     return result
//   }

//   logout(): void {
//     this.setLoggedIn(false)
//   }

//   private setLoggedIn(value: boolean): void {
//     localStorage.setItem('isLoggedIn', JSON.stringify(value))
//     this.isLoggedInSubject.next(value)
//   }
// }


import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'client_admin' | 'user';
  clientId?: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Mock users database
  private users = [
    {
      email: 'admin@arthnext.com',
      password: 'admin123',
      user: {
        id: 'admin_1',
        name: 'Arthnext Admin',
        email: 'admin@arthnext.com',
        role: 'super_admin' as const
      }
    },
    {
      email: 'admin@nextloop.com',
      password: 'admin123',
      user: {
        id: 'client_1',
        name: 'Nextloop Admin',
        email: 'admin@nextloop.com',
        role: 'client_admin' as const,
        clientId: 'client_1'
      }
    },
    {
      email: 'piyush@nextloop.com',
      password: 'piyush123',
      user: {
        id: 'user_1',
        name: 'Piyush Kumar',
        email: 'piyush@nextloop.com',
        role: 'user' as const,
        clientId: 'client_1'
      }
    }
  ];

  constructor() {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(email: string, password: string): {
    success: boolean;
    emailError?: boolean;
    passwordError?: boolean;
    user?: AuthUser;
  } {
    const userRecord = this.users.find(u => u.email === email);

    if (!userRecord) {
      return { success: false, emailError: true };
    }

    if (userRecord.password !== password) {
      return { success: false, passwordError: true };
    }

    // Successful login
    this.currentUserSubject.next(userRecord.user);
    localStorage.setItem('currentUser', JSON.stringify(userRecord.user));
        localStorage.setItem('isLoggedIn', 'true');
    return { success: true, user: userRecord.user };
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
        localStorage.setItem('isLoggedIn', 'false');
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getUserRole(): 'super_admin' | 'client_admin' | 'user' | null {
    return this.currentUserSubject.value?.role || null;
  }
}