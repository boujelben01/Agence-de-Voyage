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
import { customerGuard } from './customer.guard';

type ProfileState = UserProfile | null | undefined;

function setup(initial: ProfileState): WritableSignal<ProfileState> {
  const profile = signal<ProfileState>(initial);
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { profile } }],
  });
  return profile;
}

function run(url = '/profil'): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    (customerGuard as CanActivateFn)({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  const promise = firstValueFrom(result as Observable<boolean | UrlTree>);
  TestBed.tick();
  return promise;
}

const client: UserProfile = { uid: 'u1', email: 'u@test.com', name: 'Ada', role: 'user' };
const admin: UserProfile = { uid: 'a1', email: 'a@test.com', name: 'Admin', role: 'admin' };

describe('customerGuard', () => {
  it('renvoie un visiteur vers /connexion avec returnUrl', async () => {
    setup(null);
    const result = await run('/profil?onglet=reservations');
    const router = TestBed.inject(Router);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/connexion?returnUrl=%2Fprofil%3Fonglet%3Dreservations',
    );
  });

  it('renvoie un administrateur vers /admin', async () => {
    setup(admin);
    const result = await run('/reservation/10');
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/admin');
  });

  it('autorise un client', async () => {
    setup(client);
    expect(await run()).toBe(true);
  });

  it('attend la fin du chargement du profil avant de décider', async () => {
    const profile = setup(undefined);
    let settled = false;
    const pending = run().then((value) => {
      settled = true;
      return value;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    profile.set(client);
    TestBed.tick();
    expect(await pending).toBe(true);
  });
});
