import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';

type ProfileState = UserProfile | null | undefined;

function setupGuard(initial: ProfileState): WritableSignal<ProfileState> {
  const profile = signal<ProfileState>(initial);
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { profile } }],
  });
  return profile;
}

function runGuard(
  guard: CanActivateFn,
  url = '/mes-reservations',
): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  const promise = firstValueFrom(result as Observable<boolean | UrlTree>);
  TestBed.tick();
  return promise;
}

const user: UserProfile = { uid: 'u1', email: 'u@test.com', name: 'U', role: 'user' };

describe('authGuard', () => {
  it('attend la fin du chargement avant de décider', async () => {
    const profile = setupGuard(undefined);
    let settled = false;
    const pending = runGuard(authGuard).then((value) => {
      settled = true;
      return value;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    profile.set(user);
    TestBed.tick();
    expect(await pending).toBe(true);
  });

  it('autorise un utilisateur connecté', async () => {
    setupGuard(user);
    expect(await runGuard(authGuard)).toBe(true);
  });

  it('redirige un visiteur vers /connexion avec returnUrl', async () => {
    setupGuard(null);
    const result = await runGuard(authGuard, '/mes-reservations');
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/connexion?returnUrl=%2Fmes-reservations',
    );
  });
});

describe('adminGuard', () => {
  it('redirige un visiteur vers /connexion', async () => {
    setupGuard(null);
    const result = await runGuard(adminGuard, '/admin');
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/connexion?returnUrl=%2Fadmin',
    );
  });

  it('redirige un utilisateur non admin vers /', async () => {
    setupGuard(user);
    const result = await runGuard(adminGuard, '/admin');
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('autorise un administrateur', async () => {
    setupGuard({ ...user, role: 'admin' });
    expect(await runGuard(adminGuard, '/admin')).toBe(true);
  });
});

describe('guestGuard', () => {
  it('laisse un visiteur ouvrir la page', async () => {
    setupGuard(null);
    expect(await runGuard(guestGuard, '/connexion')).toBe(true);
  });

  it('redirige un utilisateur connecté vers /', async () => {
    setupGuard(user);
    const result = await runGuard(guestGuard, '/connexion');
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});
