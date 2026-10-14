import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { authGuard } from '../../core/guards/auth.guard';
import { customerGuard } from '../../core/guards/customer.guard';
import { BOOKING_ROUTES } from '../booking/booking.routes';
import { paramForTab, redirectToReservationsTab, tabFromParam } from './profile-tabs';

@Component({ template: '' })
class DummyComponent {}

describe('onglets du profil', () => {
  it('lit l’onglet demandé, « informations » par défaut', () => {
    expect(tabFromParam('reservations')).toBe('reservations');
    expect(tabFromParam(null)).toBe('informations');
    expect(tabFromParam('autre')).toBe('informations');
  });

  it('gère l’onglet des favoris', () => {
    expect(tabFromParam('favoris')).toBe('favoris');
    expect(paramForTab('favoris')).toBe('favoris');
    expect(paramForTab('reservations')).toBe('reservations');
    expect(paramForTab('informations')).toBeNull();
  });

  it('redirige /mes-reservations vers /profil?onglet=reservations', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'mes-reservations', pathMatch: 'full', redirectTo: redirectToReservationsTab },
          { path: 'profil', component: DummyComponent },
        ]),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/mes-reservations');
    expect(router.url).toBe('/profil?onglet=reservations');
  });

  it('configure bien l’ancienne route et les gardes dans app.routes', () => {
    const legacy = routes.find((route) => route.path === 'mes-reservations');
    expect(legacy?.redirectTo).toBe(redirectToReservationsTab);

    const profile = routes.find((route) => route.path === 'profil');
    expect(profile?.canActivate).toEqual([customerGuard]);
  });

  it('réserve la réservation et la confirmation aux clients connectés', () => {
    for (const path of ['reservation/:tourId', 'confirmation/:id', 'billet/:id']) {
      const route = BOOKING_ROUTES.find((r) => r.path === path);
      expect(route?.canActivate, path).toEqual([authGuard, customerGuard]);
    }
    expect(BOOKING_ROUTES.some((r) => r.path === 'mes-reservations')).toBe(false);
  });
});
