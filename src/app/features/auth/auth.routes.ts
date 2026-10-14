import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'connexion',
    canActivate: [guestGuard],
    title: 'Connexion',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'inscription',
    canActivate: [guestGuard],
    title: 'Inscription',
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
  },
];
