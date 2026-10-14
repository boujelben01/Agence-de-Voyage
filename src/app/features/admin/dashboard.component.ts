import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { AdminService } from '../../core/services/admin.service';
import { CatalogService } from '../../core/services/catalog.service';
import { formatDate, formatPrice } from '../catalog/catalog-filters';
import {
  Summary,
  barWidth,
  latestReservations,
  revenueByMonth,
  summarize,
  topDestinations,
} from './admin-stats';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; reservations: Reservation[]; tours: number; accommodations: number };

interface StatCard {
  label: string;
  value: string;
  note: string;
  /** Tracé SVG (viewBox 24x24, trait). */
  path: string;
  iconClass: string;
}

/** Tableau de bord : synthèse des réservations et du catalogue, sans bibliothèque de graphiques. */
@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, PageHeaderComponent, BadgeComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [compact]="true"
      eyebrow="Back-office"
      title="Tableau de bord"
      description="Vue d’ensemble de l’activité de l’agence."
    />

    @switch (state().status) {
      @case ('loading') {
        <div class="mt-8" role="status" aria-live="polite">
          <span class="sr-only">Chargement du tableau de bord…</span>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            @for (n of skeletons; track n) {
              <app-skeleton class="h-28 rounded-card" />
            }
          </div>
        </div>
      }
      @case ('error') {
        <app-empty-state
          class="mt-8"
          tone="error"
          icon="alert"
          [alert]="true"
          title="Impossible de charger le tableau de bord"
          [description]="errorMessage()"
        >
          <button type="button" class="btn-primary" (click)="load()">Réessayer</button>
        </app-empty-state>
      }
      @case ('ready') {
        @if (summary()) {
          <ul class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Chiffres clés">
            @for (stat of statCards(); track stat.label) {
              <li class="stat-card flex items-start gap-4">
                <span
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-field"
                  [class]="stat.iconClass"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" class="h-6 w-6">
                    <path
                      [attr.d]="stat.path"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="stat-label">{{ stat.label }}</p>
                  <p class="stat-value">{{ stat.value }}</p>
                  @if (stat.note) {
                    <p class="mt-1 text-xs text-ocean-800">{{ stat.note }}</p>
                  }
                </div>
              </li>
            }
          </ul>

          <div class="mt-6 grid gap-6 xl:grid-cols-2">
            <section class="card p-6" aria-labelledby="top-title">
              <h2 id="top-title" class="text-h3 text-ocean-950">Destinations les plus réservées</h2>
              @if (top().length === 0) {
                <p class="mt-4 text-sm text-ocean-800">Aucune réservation confirmée pour le moment.</p>
              } @else {
                <ol class="mt-5 space-y-5">
                  @for (item of top(); track item.tourId; let i = $index) {
                    <li>
                      <div class="flex items-baseline justify-between gap-3 text-sm">
                        <span class="font-medium text-ocean-950">
                          {{ i + 1 }}. {{ item.title }}
                          <span class="font-normal text-ocean-800">· {{ item.country }}</span>
                        </span>
                        <span class="shrink-0 font-semibold text-ocean-950">
                          {{ item.count }} {{ item.count > 1 ? 'réservations' : 'réservation' }}
                        </span>
                      </div>
                      <div class="mt-2 h-3 rounded-full bg-ocean-100" aria-hidden="true">
                        <div
                          class="h-full rounded-full bg-ocean-700"
                          [style.width.%]="width(item.count, topMax())"
                        ></div>
                      </div>
                    </li>
                  }
                </ol>
              }
            </section>

            <section class="card p-6" aria-labelledby="revenue-title">
              <h2 id="revenue-title" class="text-h3 text-ocean-950">Chiffre d’affaires sur 6 mois</h2>
              <ul class="mt-5 space-y-5">
                @for (month of months(); track month.key) {
                  <li>
                    <div class="flex items-baseline justify-between gap-3 text-sm">
                      <span class="font-medium capitalize text-ocean-950">{{ month.label }}</span>
                      <span class="font-semibold text-ocean-950">{{ price(month.total) }}</span>
                    </div>
                    <div class="mt-2 h-3 rounded-full bg-ocean-100" aria-hidden="true">
                      <div
                        class="h-full rounded-full bg-sand-700"
                        [style.width.%]="width(month.total, monthMax())"
                      ></div>
                    </div>
                  </li>
                }
              </ul>
            </section>
          </div>

          <section class="card mt-6 p-6" aria-labelledby="latest-title">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 id="latest-title" class="text-h3 text-ocean-950">Dernières réservations</h2>
              <a routerLink="/admin/reservations" class="btn-outline btn-sm">
                Voir toutes les réservations
              </a>
            </div>
            @if (latest().length === 0) {
              <p class="mt-4 text-sm text-ocean-800">Aucune réservation pour le moment.</p>
            } @else {
              <ul class="mt-4 divide-y divide-ocean-100">
                @for (r of latest(); track r.id) {
                  <li class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ocean-950">{{ r.tourTitle }}</p>
                      <p class="truncate text-ocean-800">
                        {{ r.userEmail }} · départ le {{ date(r.startDate) }}
                      </p>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="font-semibold text-ocean-950">{{ price(r.totalPrice) }}</span>
                      <app-badge [tone]="r.status === 'confirmed' ? 'success' : 'danger'">{{
                        r.status === 'confirmed' ? 'Confirmée' : 'Annulée'
                      }}</app-badge>
                    </div>
                  </li>
                }
              </ul>
            }
          </section>
        }
      }
    }
  `,
})
export class DashboardComponent {
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly skeletons = [1, 2, 3, 4, 5, 6];
  protected readonly price = formatPrice;
  protected readonly date = formatDate;
  protected readonly width = barWidth;

  protected readonly state = signal<DashboardState>({ status: 'loading' });
  private subscription: Subscription | null = null;

  private readonly reservations = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.reservations : [];
  });

  protected readonly summary = computed<Summary | null>(() => {
    const state = this.state();
    return state.status === 'ready'
      ? summarize(state.reservations, state.tours, state.accommodations)
      : null;
  });
  protected readonly statCards = computed<StatCard[]>(() => {
    const s = this.summary();
    if (!s) {
      return [];
    }
    return [
      {
        label: 'Réservations confirmées',
        value: String(s.confirmed),
        note: '',
        path: 'M5 12.5l4.5 4.5L19 7.5',
        iconClass: 'bg-emerald-100 text-emerald-800',
      },
      {
        label: 'Réservations annulées',
        value: String(s.cancelled),
        note: '',
        path: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
        iconClass: 'bg-red-100 text-red-800',
      },
      {
        label: 'Chiffre d’affaires',
        value: formatPrice(s.revenue),
        note: 'Réservations confirmées uniquement',
        path: 'M4 17l5-5 4 4 7-8M15 8h5v5',
        iconClass: 'bg-sand-100 text-sand-700',
      },
      {
        label: 'Circuits',
        value: String(s.tours),
        note: '',
        path: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
        iconClass: 'bg-ocean-100 text-ocean-800',
      },
      {
        label: 'Hébergements',
        value: String(s.accommodations),
        note: '',
        path: 'M3 20V10l9-6 9 6v10M9 20v-6h6v6',
        iconClass: 'bg-ocean-100 text-ocean-800',
      },
    ];
  });
  protected readonly top = computed(() => topDestinations(this.reservations(), 5));
  protected readonly topMax = computed(() => Math.max(0, ...this.top().map((t) => t.count)));
  protected readonly months = computed(() => revenueByMonth(this.reservations(), new Date(), 6));
  protected readonly monthMax = computed(() => Math.max(0, ...this.months().map((m) => m.total)));
  protected readonly latest = computed(() => latestReservations(this.reservations(), 5));

  constructor() {
    this.load();
  }

  protected errorMessage(): string {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  }

  protected load(): void {
    this.subscription?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.subscription = forkJoin({
      reservations: this.admin.listAllReservations(),
      tours: this.catalog.getTours(),
      accommodations: this.catalog.getAccommodations(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ reservations, tours, accommodations }) =>
          this.state.set({
            status: 'ready',
            reservations,
            tours: tours.length,
            accommodations: accommodations.length,
          }),
        error: (error: unknown) =>
          this.state.set({
            status: 'error',
            message: error instanceof Error ? error.message : 'Une erreur est survenue.',
          }),
      });
  }
}
