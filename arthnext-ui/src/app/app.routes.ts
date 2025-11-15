import { Routes } from '@angular/router'
import { LoginComponent } from './components/login/login.component'
import { HomeComponent } from './components/home/home.component'
import { AuthGuard } from './auth.guard'
import { BlogsComponent } from './components/blogs/blogs.component'
import { InvalidPageComponent } from './components/invalid-page/invalid-page.component'
import { DataRenderingComponent } from './components/data-rendering/data-rendering.component'
import { EsignComponent } from './esign/esign.component'
import { PdfSelectorComponent } from './pdf-sign/pdf-sign.component'
import { MultisignComponent } from './multisign/multisign.component'
import { MultisignatureComponent } from './multisignature/multisignature.component'
import { EsignStatusComponent } from './esign-status/esign-status.component'
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'esign', component: EsignComponent, canActivate: [AuthGuard] },
  { path: 'pdfsign', component: PdfSelectorComponent, canActivate: [AuthGuard] },
  { path: 'multisign', component: MultisignComponent, canActivate: [AuthGuard] },
    { path: 'esignStatus', component: EsignStatusComponent, canActivate: [AuthGuard] },
    { path: 'multisignature', component: MultisignatureComponent, canActivate: [AuthGuard] },
  {
    path: 'data-rendering',
    component: DataRenderingComponent,
    canActivate: [AuthGuard],
  },
  { path: '**', component: InvalidPageComponent },
]

// Lazy loading approch
// {path:'home', loadComponent:()=>import('./components/home/home.component').then(c=>c.HomeComponent)}
// {path:'login', loadComponent:()=>import('./components/login/login.component').then(c=>c.LoginComponent)}
// {path:'blogs', loadComponent:()=>import('./components/blogs/blogs.component').then(c=>c.BlogsComponent)}
