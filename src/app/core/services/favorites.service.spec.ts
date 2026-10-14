import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { UserProfile } from '../models/user.model';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from './auth.service';
import { FavoritesService } from './favorites.service';

/** Remplace uniquement les accès Firestore : toute la logique du service est exercée. */
class RecordingFavoritesService extends FavoritesService {
  stored: string[] = [];
  readonly added: string[] = [];
  readonly removed: string[] = [];
  readonly reads: string[] = [];
  failWrites = false;
  failReads = false;

  protected override async readIds(uid: string): Promise<string[]> {
    this.reads.push(uid);
    if (this.failReads) {
      throw new Error('lecture');
    }
    return this.stored;
  }

  protected override async addFavorite(_uid: string, tourId: string): Promise<void> {
    if (this.failWrites) {
      throw new Error('écriture');
    }
    this.added.push(tourId);
  }

  protected override async removeFavorite(_uid: string, tourId: string): Promise<void> {
    if (this.failWrites) {
      throw new Error('écriture');
    }
    this.removed.push(tourId);
  }
}

const customer: UserProfile = { uid: 'u1', email: 'ada@test.com', name: 'Ada', role: 'user' };

describe('FavoritesService', () => {
  let profile: ReturnType<typeof signal<UserProfile | null | undefined>>;

  function setup(initial: UserProfile | null | undefined = customer, stored: string[] = []) {
    profile = signal(initial);
    TestBed.configureTestingModule({
      providers: [
        RecordingFavoritesService,
        { provide: AuthService, useValue: { profile } },
        { provide: Firestore, useValue: {} },
      ],
    });
    const service = TestBed.inject(RecordingFavoritesService);
    service.stored = stored;
    return service;
  }

  async function settle(): Promise<void> {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  }

  it('charge les favoris du client connecté', async () => {
    const service = setup(customer, ['t1', 't2']);
    await settle();

    expect(service.status()).toBe('ready');
    expect([...service.ids()]).toEqual(['t1', 't2']);
    expect(service.isFavorite('t1')).toBe(true);
    expect(service.isFavorite('t9')).toBe(false);
    expect(service.reads).toEqual(['u1']);
  });

  it('reste vide pour un visiteur ou un administrateur, sans lecture', async () => {
    const visitor = setup(null);
    await settle();
    expect(visitor.ids().size).toBe(0);
    expect(visitor.status()).toBe('idle');
    expect(visitor.reads).toEqual([]);
    expect(await visitor.toggle('t1')).toBe(false);
    expect(visitor.added).toEqual([]);
    expect(visitor.ids().size).toBe(0);
  });

  it('ne lit rien pour un administrateur', async () => {
    const admin = setup({ ...customer, role: 'admin' });
    await settle();
    expect(admin.reads).toEqual([]);
    expect(await admin.toggle('t1')).toBe(false);
  });

  it('met à jour le signal tout de suite (optimiste) puis écrit', async () => {
    const service = setup();
    await settle();

    const pending = service.toggle('t1');
    expect(service.isFavorite('t1')).toBe(true);
    expect(await pending).toBe(true);
    expect(service.added).toEqual(['t1']);

    expect(await service.toggle('t1')).toBe(true);
    expect(service.isFavorite('t1')).toBe(false);
    expect(service.removed).toEqual(['t1']);
  });

  it('rétablit l’état précédent et affiche un toast d’erreur si l’écriture échoue', async () => {
    const service = setup(customer, ['t2']);
    await settle();
    const toast = TestBed.inject(ToastService);
    service.failWrites = true;

    const pending = service.toggle('t1');
    expect(service.isFavorite('t1')).toBe(true);
    expect(await pending).toBe(false);
    expect(service.isFavorite('t1')).toBe(false);

    expect(await service.toggle('t2')).toBe(false);
    expect(service.isFavorite('t2')).toBe(true);

    const errors = toast.toasts().filter((t) => t.kind === 'error');
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toContain('ajouter');
    expect(errors[1].message).toContain('retirer');
  });

  it('ignore un second clic pendant que l’écriture est en cours', async () => {
    const service = setup();
    await settle();

    const first = service.toggle('t1');
    expect(await service.toggle('t1')).toBe(false);
    await first;
    expect(service.added).toEqual(['t1']);
  });

  it('se recharge à la connexion et se vide à la déconnexion', async () => {
    const service = setup(null, ['t1']);
    await settle();
    expect(service.ids().size).toBe(0);

    profile.set(customer);
    await settle();
    expect([...service.ids()]).toEqual(['t1']);

    profile.set(null);
    await settle();
    expect(service.ids().size).toBe(0);
    expect(service.status()).toBe('idle');
  });

  it('passe en erreur si la lecture échoue, puis permet de réessayer', async () => {
    const service = setup(customer, ['t1']);
    service.failReads = true;
    await settle();
    expect(service.status()).toBe('error');

    service.failReads = false;
    await service.retry();
    expect(service.status()).toBe('ready');
    expect(service.isFavorite('t1')).toBe(true);
  });
});
