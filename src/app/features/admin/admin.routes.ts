import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';

/** Routes du back-office ; l'accès est protégé par adminGuard dans app.routes.ts. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: '',
        title: 'Tableau de bord',
        loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'circuits',
        title: 'Circuits',
        loadComponent: () =>
          import('./tours-admin.component').then((m) => m.ToursAdminComponent),
      },
      {
        path: 'hebergements',
        title: 'Hébergements',
        loadComponent: () =>
          import('./accommodations-admin.component').then((m) => m.AccommodationsAdminComponent),
      },
      {
        path: 'reservations',
        title: 'Réservations',
        loadComponent: () =>
          import('./reservations-admin.component').then((m) => m.ReservationsAdminComponent),
      },
    ],
  },
];
