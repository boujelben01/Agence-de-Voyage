import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { customerGuard } from './core/guards/customer.guard';
import { redirectToReservationsTab } from './features/profile/profile-tabs';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Accueil',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    loadChildren: () => import('./features/booking/booking.routes').then((m) => m.BOOKING_ROUTES),
  },
  {
    path: 'destinations',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.CATALOG_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'profil',
    canActivate: [customerGuard],
    title: 'Mon profil',
    loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  // Anciens liens : « Mes réservations » est désormais un onglet du profil.
  { path: 'mes-reservations', pathMatch: 'full', redirectTo: redirectToReservationsTab },
  {
    path: '**',
    title: 'Page introuvable',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
