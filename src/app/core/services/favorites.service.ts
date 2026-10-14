import {
  EnvironmentInjector,
  Injectable,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from './auth.service';

export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Circuits favoris du client connecté : sous-collection users/{uid}/favorites, un document par
 * circuit (id du document = id du circuit). Vide pour un visiteur ou un administrateur. Le profil
 * est lu en lecture seule via AuthService ; la liste se recharge à chaque connexion/déconnexion.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly toast = inject(ToastService);

  private readonly _ids = signal<ReadonlySet<string>>(new Set());
  private readonly _status = signal<FavoritesStatus>('idle');

  /** Ids des circuits favoris (mise à jour optimiste incluse). */
  readonly ids = this._ids.asReadonly();
  readonly status = this._status.asReadonly();

  /** uid du client connecté ; null pour un visiteur, un administrateur ou pendant le chargement. */
  private readonly customerUid = computed(() => {
    const profile = this.auth.profile();
    return profile && profile.role === 'user' ? profile.uid : null;
  });

  /** Circuits dont l'écriture est en cours : évite les doubles clics concurrents. */
  private readonly pending = new Set<string>();
  /** Invalide les lectures devenues obsolètes (changement d'utilisateur, relance). */
  private generation = 0;

  constructor() {
    effect(() => {
      const uid = this.customerUid();
      untracked(() => void this.load(uid));
    });
  }

  isFavorite(tourId: string): boolean {
    return this._ids().has(tourId);
  }

  /** Relance la lecture après une erreur. */
  retry(): Promise<void> {
    return this.load(this.customerUid());
  }

  /**
   * Ajoute ou retire le circuit. Le signal est mis à jour tout de suite puis rétabli si l'écriture
   * échoue (avec un toast d'erreur). Renvoie false si rien n'a été enregistré.
   */
  async toggle(tourId: string): Promise<boolean> {
    const uid = this.customerUid();
    if (uid === null || tourId === '' || this.pending.has(tourId)) {
      return false;
    }
    const wasFavorite = this._ids().has(tourId);
    this.pending.add(tourId);
    this.setLocal(tourId, !wasFavorite);
    try {
      await (wasFavorite ? this.removeFavorite(uid, tourId) : this.addFavorite(uid, tourId));
      return true;
    } catch {
      if (this.customerUid() === uid) {
        this.setLocal(tourId, wasFavorite);
      }
      this.toast.show(
        wasFavorite
          ? 'Impossible de retirer ce circuit de vos favoris. Veuillez réessayer.'
          : 'Impossible d’ajouter ce circuit à vos favoris. Veuillez réessayer.',
        'error',
      );
      return false;
    } finally {
      this.pending.delete(tourId);
    }
  }

  /** Lecture Firestore isolée (appelée dans le contexte d'injection). */
  protected async readIds(uid: string): Promise<string[]> {
    return runInInjectionContext(this.injector, async () => {
      const snapshot = await getDocs(collection(this.firestore, 'users', uid, 'favorites'));
      return snapshot.docs.map((d) => d.id);
    });
  }

  protected async addFavorite(uid: string, tourId: string): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      setDoc(doc(this.firestore, 'users', uid, 'favorites', tourId), {
        tourId,
        createdAt: serverTimestamp(),
      }),
    );
  }

  protected async removeFavorite(uid: string, tourId: string): Promise<void> {
    await runInInjectionContext(this.injector, () =>
      deleteDoc(doc(this.firestore, 'users', uid, 'favorites', tourId)),
    );
  }

  private async load(uid: string | null): Promise<void> {
    const generation = ++this.generation;
    this.pending.clear();
    if (uid === null) {
      this._ids.set(new Set());
      this._status.set('idle');
      return;
    }
    this._ids.set(new Set());
    this._status.set('loading');
    try {
      const ids = await this.readIds(uid);
      if (generation === this.generation) {
        this._ids.set(new Set(ids));
        this._status.set('ready');
      }
    } catch {
      if (generation === this.generation) {
        this._status.set('error');
      }
    }
  }

  private setLocal(tourId: string, favorite: boolean): void {
    this._ids.update((current) => {
      const next = new Set(current);
      if (favorite) {
        next.add(tourId);
      } else {
        next.delete(tourId);
      }
      return next;
    });
  }
}
