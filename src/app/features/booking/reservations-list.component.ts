import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { ReservationService } from '../../core/services/reservation.service';
import { ToastService } from '../../shared/toast/toast.service';
import { formatDate, formatPrice } from '../catalog/catalog-filters';
import { formatTravelers } from './booking-utils';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; reservations: Reservation[] };

/**
 * Liste des réservations de l'utilisateur connecté, avec annulation confirmée par une boîte de
 * dialogue. Composant de contenu : le titre de page et le conteneur principal sont fournis par la
 * page qui l'accueille (onglet du profil).
 */
@Component({
  selector: 'app-reservations-list',
  imports: [RouterLink, BadgeComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section #root tabindex="-1" class="focus:outline-none" aria-labelledby="reservations-title">
      <h2 id="reservations-title" class="text-h3 text-ocean-950">Mes réservations</h2>

      <div class="mt-6">
        @switch (state().status) {
          @case ('loading') {
            <div role="status" aria-live="polite">
              <span class="sr-only">Chargement de vos réservations…</span>
              <ul class="grid gap-6 md:grid-cols-2" aria-hidden="true">
                @for (n of skeletons; track n) {
                  <li><app-skeleton class="h-72 rounded-card" /></li>
                }
              </ul>
            </div>
          }
          @case ('error') {
            <app-empty-state
              tone="error"
              icon="alert"
              [alert]="true"
              [level]="3"
              title="Impossible de charger vos réservations"
              [description]="errorMessage()"
            >
              <button type="button" class="btn-primary" (click)="load()">Réessayer</button>
            </app-empty-state>
          }
          @case ('ready') {
            @if (items().length === 0) {
              <app-empty-state
                icon="calendar"
                [level]="3"
                title="Vous n’avez pas encore de réservation"
                description="Explorez nos destinations et réservez votre prochain voyage."
              >
                <a routerLink="/destinations" class="btn-primary">Voir les destinations</a>
              </app-empty-state>
            } @else {
              <p class="text-sm font-medium text-ocean-800" role="status" aria-live="polite">
                {{ items().length }} {{ items().length > 1 ? 'réservations' : 'réservation' }}
              </p>
              <ul class="mt-4 grid gap-6 md:grid-cols-2">
                @for (r of items(); track r.id) {
                  <li>
                    <article class="card flex h-full flex-col overflow-hidden">
                      <img
                        [src]="r.tourImage"
                        alt=""
                        width="800"
                        height="400"
                        loading="lazy"
                        class="aspect-[2/1] w-full object-cover"
                      />
                      <div class="flex flex-1 flex-col p-5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <p class="eyebrow">{{ r.country }}</p>
                          <app-badge [tone]="r.status === 'confirmed' ? 'success' : 'danger'">{{
                            r.status === 'confirmed' ? 'Confirmée' : 'Annulée'
                          }}</app-badge>
                        </div>
                        <h3 class="mt-2 text-h3 text-ocean-950">{{ r.tourTitle }}</h3>
                        <p class="mt-2 text-sm text-ocean-800">
                          Du {{ date(r.startDate) }} au {{ date(r.endDate) }}
                        </p>
                        <p class="mt-1 text-sm text-ocean-800">{{ travelers(r.travelers) }}</p>
                        <p class="mt-1 text-sm text-ocean-800">
                          Référence : <span class="font-mono">{{ r.id }}</span>
                        </p>
                        <div
                          class="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ocean-100 pt-4"
                        >
                          <p class="text-xl font-semibold tracking-tight text-ocean-950">
                            {{ price(r.totalPrice) }}
                          </p>
                          @if (r.status === 'confirmed') {
                            <div class="flex flex-wrap items-center gap-2">
                              <a [routerLink]="['/billet', r.id]" class="btn-outline btn-sm">
                                Télécharger le billet (PDF)
                                <span class="sr-only">de la réservation {{ r.tourTitle }}</span>
                              </a>
                              <button type="button" class="btn-outline btn-sm" (click)="askCancel(r, $event)">
                                Annuler
                                <span class="sr-only">la réservation {{ r.tourTitle }}</span>
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    </article>
                  </li>
                }
              </ul>
            }
          }
        }
      </div>

      <dialog
        #dialog
        class="dialog max-w-md"
        aria-labelledby="cancel-title"
        aria-describedby="cancel-description"
        (close)="onDialogClose()"
      >
        @if (pending(); as target) {
          <div class="p-6 sm:p-8">
            <h2 id="cancel-title" class="dialog-title">Annuler cette réservation ?</h2>
            <p id="cancel-description" class="mt-3 text-ocean-800">
              Votre séjour « {{ target.tourTitle }} » du {{ date(target.startDate) }} sera annulé.
              Cette action est définitive.
            </p>
            <div class="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                class="btn-outline btn-sm"
                (click)="closeDialog()"
                [disabled]="cancelling()"
              >
                Garder ma réservation
              </button>
              <button
                type="button"
                class="btn-danger btn-sm"
                (click)="confirmCancel()"
                [disabled]="cancelling()"
              >
                {{ cancelling() ? 'Annulation…' : 'Oui, annuler' }}
              </button>
            </div>
          </div>
        }
      </dialog>
    </section>
  `,
})
export class ReservationsListComponent {
  private readonly reservations = inject(ReservationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly date = formatDate;
  protected readonly price = formatPrice;
  protected readonly travelers = formatTravelers;

  protected readonly state = signal<ListState>({ status: 'loading' });
  /** Réservation dont l'annulation attend la confirmation de l'utilisateur. */
  protected readonly pending = signal<Reservation | null>(null);
  protected readonly cancelling = signal(false);

  private subscription: Subscription | null = null;
  /** Bouton « Annuler » à l'origine de la boîte de dialogue, pour lui rendre le focus. */
  private opener: HTMLElement | null = null;

  constructor() {
    this.load();
  }

  protected items(): Reservation[] {
    const state = this.state();
    return state.status === 'ready' ? state.reservations : [];
  }

  protected errorMessage(): string {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  }

  protected load(): void {
    this.subscription?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.subscription = this.reservations
      .listMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reservations) => this.state.set({ status: 'ready', reservations }),
        error: (error: unknown) =>
          this.state.set({
            status: 'error',
            message: error instanceof Error ? error.message : 'Une erreur est survenue.',
          }),
      });
  }

  protected askCancel(reservation: Reservation, event: Event): void {
    this.opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pending.set(reservation);
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  protected closeDialog(): void {
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      this.onDialogClose();
    }
  }

  /** Appelé à chaque fermeture (bouton, Échap) : libère la cible et rend le focus. */
  protected onDialogClose(): void {
    this.pending.set(null);
    // Sans bouton d'origine (réservation annulée, bouton retiré), le focus revient à la liste.
    const target = this.opener?.isConnected ? this.opener : this.root().nativeElement;
    target.focus();
    this.opener = null;
  }

  protected confirmCancel(): void {
    const target = this.pending();
    if (!target || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.reservations
      .cancel(target.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.state.update((state) =>
            state.status === 'ready'
              ? {
                  status: 'ready',
                  reservations: state.reservations.map((r) =>
                    r.id === target.id ? { ...r, status: 'cancelled' } : r,
                  ),
                }
              : state,
          );
          this.cancelling.set(false);
          // Le bouton d'origine va disparaître : le focus est rendu à la liste à la fermeture.
          this.opener = null;
          this.closeDialog();
          this.toast.show('Votre réservation a été annulée.');
        },
        error: (error: unknown) => {
          this.cancelling.set(false);
          this.closeDialog();
          this.toast.show(
            error instanceof Error ? error.message : "L'annulation a échoué. Veuillez réessayer.",
            'error',
          );
        },
      });
  }
}
