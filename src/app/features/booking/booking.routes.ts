import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { customerGuard } from '../../core/guards/customer.guard';

export const BOOKING_ROUTES: Routes = [
  {
    path: 'reservation/:tourId',
    canActivate: [authGuard, customerGuard],
    title: 'Réserver',
    loadComponent: () =>
      import('./booking-form.component').then((m) => m.BookingFormComponent),
  },
  {
    path: 'confirmation/:id',
    canActivate: [authGuard, customerGuard],
    title: 'Confirmation',
    loadComponent: () =>
      import('./booking-confirmation.component').then((m) => m.BookingConfirmationComponent),
  },
  {
    path: 'billet/:id',
    canActivate: [authGuard, customerGuard],
    title: 'Billet',
    loadComponent: () => import('./ticket.component').then((m) => m.TicketComponent),
  },
];
