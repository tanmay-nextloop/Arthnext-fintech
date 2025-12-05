// import { Component, OnInit, OnDestroy } from '@angular/core'
// import { CommonModule, NgIf } from '@angular/common'
// import { RouterLink, RouterOutlet, Router } from '@angular/router'
// import { Subscription } from 'rxjs'
// import { AuthService } from './service/Auth/auth.service'

// @Component({
//   selector: 'app-root',
//   standalone: true,
//   imports: [CommonModule, RouterOutlet, RouterLink, NgIf],
//   templateUrl: './app.component.html',
//   styleUrls: ['./app.component.scss'],
// })
// export class AppComponent implements OnInit, OnDestroy {
//   title = 'Angular Practice'
//   isLoggedIn: boolean = false

//   private authSubscription: Subscription | undefined

//   constructor(
//     private router: Router,
//     private authService: AuthService,
//   ) {}

//   logout() {
//     this.authService.logout()
//     this.router.navigate(['/login'])
//   }

//   ngOnInit() {
//     this.authSubscription = this.authService.isLoggedIn$.subscribe(
//       isLoggedIn => {
//         this.isLoggedIn = isLoggedIn
//         if (!isLoggedIn) {
//           this.router.navigate(['/login'])
//         }
//       },
//     )
//   }

//   ngOnDestroy() {
//     if (this.authSubscription) {
//       this.authSubscription.unsubscribe()
//     }
//   }
// }


import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './service/Auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is logged in on init
    this.isLoggedIn = this.authService.isLoggedIn();
    
    // Subscribe to auth changes if you have an observable
    // If not, just check on init
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}