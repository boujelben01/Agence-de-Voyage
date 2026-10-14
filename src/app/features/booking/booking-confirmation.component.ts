import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { ReservationService } from '../../core/services/reservation.service';
import { formatDate, formatPrice } from '../catalog/catalog-filters';
import { RESERVATIONS_TAB_PARAM } from '../profile/profile-tabs';
import { formatTravelers } from './booking-utils';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { StepsComponent } from '../../shared/steps/steps.component';

type ConfirmationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; reservation: Reservation };

/** Confirmation d'une réservation, visible uniquement par son propriétaire. */
@Component({
  selector: 'app-booking-confirmation',
  imports: [RouterLink, BadgeComponent, EmptyStateComponent, SkeletonComponent, StepsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="contenu" tabindex="-1" class="focus:outline-none">
      @switch (state().status) {
        @case ('loading') {
          <div class="mx-auto max-w-2xl px-4 py-16 sm:px-6" role="status" aria-live="polite">
            <h1 class="sr-only">Chargement de la réservation…</h1>
            <app-skeleton class="h-80 rounded-card" />
          </div>
        }
        @case ('error') {
          <div class="mx-auto max-w-2xl px-4 section-tight sm:px-6">
            <app-empty-state
              tone="error"
              icon="alert"
              [alert]="true"
              [level]="1"
              title="Impossible de charger la réservation"
              description="Une erreur est survenue. Vérifiez votre connexion puis consultez vos réservations."
            >
              <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-primary">Mes réservations</a>
            </app-empty-state>
          </div>
        }
        @case ('not-found') {
          <div class="mx-auto max-w-2xl px-4 section-tight text-center sm:px-6">
            <p class="eyebrow">Erreur 404</p>
            <h1 class="mt-3 text-h1 text-ocean-950">Réservation introuvable</h1>
            <p class="mx-auto mt-3 max-w-xl text-lead text-ocean-800">
              Cette réservation n’existe pas ou n’est pas associée à votre compte.
            </p>
            <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-primary mt-8">Mes réservations</a>
          </div>
        }
        @case ('ready') {
          @if (reservation(); as r) {
            <div class="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
              <app-steps class="flex justify-center" [current]="3" />

              <div class="mt-8 text-center">
                <span
                  class="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                  [class]="
                    r.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-emerald-100 text-emerald-800'
                  "
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" class="h-8 w-8">
                    @if (r.status === 'cancelled') {
                      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                    } @else {
                      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    }
                  </svg>
                </span>
                <h1 class="mt-5 text-balance text-h1 text-ocean-950">
                  @if (r.status === 'cancelled') {
                    Réservation annulée
                  } @else {
                    Réservation confirmée
                  }
                </h1>
                <p class="mt-3 text-ocean-800">
                  Référence :
                  <span class="rounded-field bg-ocean-50 px-2 py-1 font-mono text-sm font-semibold text-ocean-950">{{
                    r.id
                  }}</span>
                </p>
              </div>

              <article class="card mt-10 overflow-hidden shadow-lift">
                <img
                  [src]="r.tourImage"
                  alt=""
                  width="1200"
                  height="600"
                  class="aspect-[2/1] w-full object-cover"
                />
                <div class="p-6 sm:p-8">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <p class="eyebrow">{{ r.country }}</p>
                    <app-badge [tone]="r.status === 'confirmed' ? 'success' : 'danger'">{{
                      r.status === 'confirmed' ? 'Confirmée' : 'Annulée'
                    }}</app-badge>
                  </div>
                  <h2 class="mt-2 text-h3 text-ocean-950">{{ r.tourTitle }}</h2>
                  <dl class="mt-6 space-y-3 text-sm">
                    <div class="flex justify-between gap-4">
                      <dt class="text-ocean-800">Départ</dt>
                      <dd class="font-semibold text-ocean-950">{{ date(r.startDate) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt class="text-ocean-800">Retour</dt>
                      <dd class="font-semibold text-ocean-950">{{ date(r.endDate) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt class="text-ocean-800">Voyageurs</dt>
                      <dd class="font-semibold text-ocean-950">{{ travelers(r.travelers) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt class="text-ocean-800">Prix par personne</dt>
                      <dd class="font-semibold text-ocean-950">{{ price(r.pricePerPerson) }}</dd>
                    </div>
                    <div class="flex items-baseline justify-between gap-4 rounded-field bg-ocean-50 px-4 py-3 text-base">
                      <dt class="font-medium text-ocean-900">Total</dt>
                      <dd class="text-2xl font-semibold tracking-tight text-ocean-950">{{ price(r.totalPrice) }}</dd>
                    </div>
                  </dl>
                </div>
              </article>

              <div class="mt-8 flex flex-wrap justify-center gap-3">
                @if (r.status === 'confirmed') {
                  <a [routerLink]="['/billet', r.id]" class="btn-sand">Télécharger le billet (PDF)</a>
                }
                <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-primary">Mes réservations</a>
                <a routerLink="/destinations" class="btn-outline">Destinations</a>
              </div>
            </div>
          }
        }
      }
    </main>
  `,
})
export class BookingConfirmationComponent {
  private readonly reservations = inject(ReservationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly date = formatDate;
  protected readonly price = formatPrice;
  protected readonly travelers = formatTravelers;
  protected readonly reservationsTab = { onglet: RESERVATIONS_TAB_PARAM };

  protected readonly state = signal<ConfirmationState>({ status: 'loading' });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          this.state.set({ status: 'loading' });
          if (id === '') {
            return of<ConfirmationState>({ status: 'not-found' });
          }
          return this.reservations.getMine(id).pipe(
            map(
              (reservation): ConfirmationState =>
                reservation ? { status: 'ready', reservation } : { status: 'not-found' },
            ),
            catchError(() => of<ConfirmationState>({ status: 'error' })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  protected reservation(): Reservation | null {
    const state = this.state();
    return state.status === 'ready' ? state.reservation : null;
  }
}
