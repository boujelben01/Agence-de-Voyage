import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Accommodation } from '../../core/models/accommodation.model';
import { Tour } from '../../core/models/tour.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import {
  accommodationTypeLabel,
  formatDate,
  formatDuration,
  formatPrice,
} from './catalog-filters';

type DetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; tour: Tour; accommodation: Accommodation | null };

/** Détail d'un circuit : galerie, description, itinéraire jour par jour et hébergement. */
@Component({
  selector: 'app-catalog-detail',
  imports: [
    RouterLink,
    BadgeComponent,
    EmptyStateComponent,
    FavoriteButtonComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="contenu" tabindex="-1" class="focus:outline-none">
      @switch (state().status) {
        @case ('loading') {
          <div role="status" aria-live="polite" class="container-page py-10">
            <h1 class="sr-only">Chargement du circuit…</h1>
            <div class="space-y-4" aria-hidden="true">
              <app-skeleton class="h-5 w-40 rounded-full" />
              <app-skeleton class="h-10 w-2/3 rounded-full" />
              <app-skeleton class="mt-6 h-[22rem] rounded-panel" />
            </div>
          </div>
        }
        @case ('error') {
          <div class="container-narrow section-tight">
            <app-empty-state
              tone="error"
              icon="alert"
              [alert]="true"
              title="Impossible de charger ce circuit"
              description="Une erreur est survenue pendant la lecture du catalogue. Vérifiez votre connexion puis réessayez."
            >
              <button type="button" class="btn-primary" (click)="reload()">Réessayer</button>
              <a routerLink="/destinations" class="btn-outline">Toutes les destinations</a>
            </app-empty-state>
          </div>
        }
        @case ('not-found') {
          <div class="container-narrow section-tight text-center">
            <p class="eyebrow">Erreur 404</p>
            <h1 class="mt-3 text-h1 text-ocean-950">Ce circuit n’existe pas</h1>
            <p class="mx-auto mt-3 max-w-xl text-lead text-ocean-800">
              Le circuit demandé est introuvable ou n’est plus proposé. Parcourez nos autres
              destinations.
            </p>
            <a routerLink="/destinations" class="btn-primary mt-8">Voir les destinations</a>
          </div>
        }
        @case ('ready') {
          @if (ready(); as view) {
            <div class="container-page pt-6 sm:pt-8">
              <a routerLink="/destinations" class="btn-outline btn-sm">
                <span aria-hidden="true">←</span> Toutes les destinations
              </a>

              <header class="mt-6 max-w-3xl">
                <p class="eyebrow">{{ view.tour.country }} · {{ view.tour.continent }}</p>
                <h1 class="mt-3 text-balance text-h1 text-ocean-950">{{ view.tour.title }}</h1>
                <p class="mt-4 flex flex-wrap items-center gap-2">
                  <app-badge tone="neutral">{{ duration(view.tour.duration) }}</app-badge>
                  <app-badge tone="neutral">{{ view.tour.continent }}</app-badge>
                  @if (view.accommodation; as stay) {
                    <app-badge tone="accent">{{ typeLabel(stay.type) }}</app-badge>
                  }
                </p>
                <app-favorite-button
                  class="mt-5"
                  [tourId]="view.tour.id"
                  [title]="view.tour.title"
                  [showLabel]="true"
                />
              </header>

              <!-- Galerie : image du circuit (priorité) et image de l'hébergement. -->
              <div
                class="mt-8 grid gap-3 overflow-hidden"
                [class]="view.accommodation ? 'lg:grid-cols-[2fr_1fr]' : ''"
              >
                <div class="relative overflow-hidden rounded-panel bg-ocean-100">
                  <img
                    [src]="view.tour.image"
                    [alt]="'Photo du circuit : ' + view.tour.title"
                    width="1600"
                    height="1000"
                    fetchpriority="high"
                    class="aspect-[16/10] w-full object-cover lg:aspect-[16/9]"
                  />
                </div>
                @if (view.accommodation; as stay) {
                  <figure class="relative hidden overflow-hidden rounded-panel bg-ocean-100 lg:block">
                    <img
                      [src]="stay.image"
                      alt=""
                      width="1200"
                      height="750"
                      loading="lazy"
                      class="h-full w-full object-cover"
                    />
                    <figcaption
                      class="absolute inset-x-3 bottom-3 rounded-field bg-white/95 px-3 py-2 text-sm font-medium text-ocean-900 shadow-soft"
                    >
                      Hébergement : {{ stay.name }}
                    </figcaption>
                  </figure>
                }
              </div>
            </div>

            <div class="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_22rem] lg:gap-14">
              <div class="space-y-14">
                <section aria-labelledby="about-title">
                  <h2 id="about-title" class="text-h2 text-ocean-950">Le voyage</h2>
                  <p class="mt-4 max-w-2xl text-lead text-ocean-800">
                    {{ view.tour.description }}
                  </p>
                </section>

                @if (view.tour.itinerary.length > 0) {
                  <section aria-labelledby="itinerary-title">
                    <h2 id="itinerary-title" class="text-h2 text-ocean-950">
                      Itinéraire jour par jour
                    </h2>
                    <ol
                      class="relative mt-8 space-y-4 before:absolute before:bottom-6 before:left-[1.0625rem] before:top-6 before:w-0.5 before:rounded-full before:bg-ocean-200"
                    >
                      @for (step of view.tour.itinerary; track $index) {
                        <li class="relative flex gap-4">
                          <span
                            class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-sm font-semibold text-white ring-4 ring-white"
                            aria-hidden="true"
                            >{{ $index + 1 }}</span
                          >
                          <div class="card flex-1 p-4 sm:p-5">
                            <h3 class="eyebrow">Jour {{ $index + 1 }}</h3>
                            <p class="mt-2 text-ocean-900">{{ step }}</p>
                          </div>
                        </li>
                      }
                    </ol>
                  </section>
                }

                <section aria-labelledby="stay-title">
                  <h2 id="stay-title" class="text-h2 text-ocean-950">Hébergement</h2>
                  @if (view.accommodation; as stay) {
                    <article class="card mt-6 overflow-hidden sm:flex">
                      <img
                        [src]="stay.image"
                        alt=""
                        width="1200"
                        height="750"
                        loading="lazy"
                        class="aspect-[16/10] w-full object-cover sm:aspect-auto sm:h-auto sm:w-64"
                      />
                      <div class="p-6">
                        <app-badge tone="accent">{{ typeLabel(stay.type) }}</app-badge>
                        <h3 class="mt-3 text-h3 text-ocean-950">{{ stay.name }}</h3>
                        <p class="mt-1 text-ocean-800">{{ stay.city }}, {{ stay.country }}</p>
                        @if (stay.stars > 0) {
                          <p class="mt-2 text-sand-700" [attr.aria-label]="stay.stars + ' étoiles'">
                            <span aria-hidden="true">{{ stars(stay.stars) }}</span>
                          </p>
                        }
                        <p class="mt-3 text-sm text-ocean-900">
                          <span class="font-semibold">{{ price(stay.pricePerNight) }}</span> par nuit
                        </p>
                        @if (stay.availableFrom && stay.availableTo) {
                          <p class="mt-1 text-sm text-ocean-800">
                            Disponible du {{ date(stay.availableFrom) }} au
                            {{ date(stay.availableTo) }}
                          </p>
                        }
                      </div>
                    </article>
                  } @else {
                    <p class="mt-4 text-ocean-800">
                      Les informations d’hébergement ne sont pas disponibles pour ce circuit.
                    </p>
                  }
                </section>
              </div>

              <aside class="order-first lg:order-last lg:sticky lg:top-24 lg:self-start" aria-label="Réservation">
                <div class="card p-6 shadow-lift">
                  <p class="text-sm font-medium text-ocean-800">À partir de</p>
                  <p class="mt-1 text-4xl font-semibold tracking-tight text-ocean-950">
                    {{ price(view.tour.price) }}
                  </p>
                  <p class="text-sm text-ocean-800">par personne</p>
                  <dl class="mt-5 space-y-3 border-t border-ocean-100 pt-5 text-sm">
                    <div class="flex justify-between gap-4">
                      <dt class="text-ocean-800">Durée</dt>
                      <dd class="font-semibold text-ocean-950">{{ duration(view.tour.duration) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt class="text-ocean-800">Destination</dt>
                      <dd class="font-semibold text-ocean-950">{{ view.tour.country }}</dd>
                    </div>
                    @if (view.accommodation; as stay) {
                      <div class="flex justify-between gap-4">
                        <dt class="text-ocean-800">Hébergement</dt>
                        <dd class="text-right font-semibold text-ocean-950">{{ typeLabel(stay.type) }}</dd>
                      </div>
                    }
                  </dl>
                  @if (auth.profile()?.role === 'admin') {
                    <p
                      id="admin-booking-note"
                      class="mt-6 rounded-field bg-ocean-50 px-4 py-3 text-center text-sm font-medium text-ocean-900"
                    >
                      Compte administrateur : réservation indisponible
                    </p>
                  } @else {
                    <a [routerLink]="['/reservation', view.tour.id]" class="btn-primary mt-6 w-full">
                      Réserver
                    </a>
                    <p class="mt-3 text-center text-sm text-ocean-800">
                      Confirmation immédiate, annulation possible depuis votre espace.
                    </p>
                  }
                </div>
              </aside>
            </div>
          }
        }
      }
    </main>
  `,
})
export class CatalogDetailComponent {
  private readonly catalog = inject(CatalogService);
  /** Lecture seule : un administrateur ne peut pas réserver. */
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly typeLabel = accommodationTypeLabel;
  protected readonly duration = formatDuration;
  protected readonly price = formatPrice;
  protected readonly date = formatDate;

  protected readonly state = signal<DetailState>({ status: 'loading' });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => this.loadOne(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.show(state));
  }

  protected ready(): { tour: Tour; accommodation: Accommodation | null } | null {
    const state = this.state();
    return state.status === 'ready' ? state : null;
  }

  protected reload(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.state.set({ status: 'loading' });
    this.loadOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.show(state));
  }

  private show(state: DetailState): void {
    this.state.set(state);
    if (state.status === 'ready') {
      this.title.setTitle(state.tour.title);
    }
  }

  private loadOne(id: string): Observable<DetailState> {
    if (id === '') {
      return of<DetailState>({ status: 'not-found' });
    }
    return this.catalog.getTour(id).pipe(
      switchMap((tour) => {
        if (tour === null) {
          return of<DetailState>({ status: 'not-found' });
        }
        const accommodation$ = tour.accommodationId
          ? this.catalog.getAccommodation(tour.accommodationId).pipe(catchError(() => of(null)))
          : of(null);
        return accommodation$.pipe(
          map((accommodation): DetailState => ({ status: 'ready', tour, accommodation })),
        );
      }),
      catchError(() => of<DetailState>({ status: 'error' })),
    );
  }

  protected stars(count: number): string {
    return '★'.repeat(Math.min(5, Math.max(0, Math.round(count))));
  }
}
