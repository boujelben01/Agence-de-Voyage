import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { DestinationCardComponent } from '../../shared/destination-card/destination-card.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import {
  TourEntry,
  accommodationTypeLabel,
  buildEntries,
  formatDuration,
  formatPrice,
} from '../catalog/catalog-filters';

type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: TourEntry[] };

/**
 * Onglet « Favoris » du profil : grille des circuits favoris (même carte que le catalogue). Le
 * cœur de chaque carte permet de retirer le circuit. Composant de contenu : le titre de page et le
 * conteneur principal sont fournis par la page qui l'accueille.
 */
@Component({
  selector: 'app-favorites-list',
  imports: [RouterLink, DestinationCardComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="favorites-title">
      <h2
        #heading
        id="favorites-title"
        tabindex="-1"
        class="text-h3 text-ocean-950 focus:outline-none"
      >
        Mes circuits favoris
      </h2>

      <div class="mt-6">
        @switch (view()) {
          @case ('loading') {
            <div role="status" aria-live="polite">
              <span class="sr-only">Chargement de vos favoris…</span>
              <ul class="grid gap-6 sm:grid-cols-2" aria-hidden="true">
                @for (n of skeletons; track n) {
                  <li><app-skeleton class="h-[24rem] rounded-card" /></li>
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
              title="Impossible de charger vos favoris"
              description="Une erreur est survenue pendant la lecture de vos favoris. Vérifiez votre connexion puis réessayez."
            >
              <button type="button" class="btn-primary" (click)="reload()">Réessayer</button>
            </app-empty-state>
          }
          @default {
            @if (items().length === 0) {
              <app-empty-state
                icon="compass"
                [level]="3"
                title="Vous n’avez pas encore de favori"
                description="Touchez le cœur d’un circuit pour le retrouver ici."
              >
                <a routerLink="/destinations" class="btn-primary">Voir les destinations</a>
              </app-empty-state>
            } @else {
              <p class="text-sm font-medium text-ocean-800" role="status" aria-live="polite">
                {{ items().length }} {{ items().length > 1 ? 'circuits favoris' : 'circuit favori' }}
              </p>
              <ul class="mt-4 grid gap-6 sm:grid-cols-2">
                @for (entry of items(); track entry.tour.id) {
                  <li>
                    <app-destination-card
                      [title]="entry.tour.title"
                      [region]="entry.tour.country"
                      [image]="entry.tour.image"
                      [badge]="entry.tour.continent"
                      [meta]="duration(entry.tour.duration)"
                      [stay]="stayLabel(entry)"
                      [price]="price(entry.tour.price)"
                      [link]="['/destinations', entry.tour.id]"
                      [favoriteTourId]="entry.tour.id"
                    />
                  </li>
                }
              </ul>
            }
          }
        }
      </div>
    </section>
  `,
})
export class FavoritesListComponent {
  private readonly catalog = inject(CatalogService);
  private readonly favorites = inject(FavoritesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly duration = formatDuration;
  protected readonly price = formatPrice;

  private readonly catalogState = signal<CatalogState>({ status: 'loading' });
  private subscription: Subscription | null = null;
  private previousCount = 0;

  /** Circuits favoris encore présents au catalogue, dans l'ordre du catalogue. */
  protected readonly items = computed(() => {
    const state = this.catalogState();
    if (state.status !== 'ready') {
      return [];
    }
    const ids = this.favorites.ids();
    return state.entries.filter((entry) => ids.has(entry.tour.id));
  });

  protected readonly view = computed<'loading' | 'error' | 'ready'>(() => {
    const catalog = this.catalogState().status;
    const favorites = this.favorites.status();
    if (catalog === 'error' || favorites === 'error') {
      return 'error';
    }
    return catalog === 'ready' && favorites === 'ready' ? 'ready' : 'loading';
  });

  constructor() {
    this.load();
    // Un cœur retiré fait disparaître la carte focalisée : le focus revient au titre de la section.
    effect(() => {
      const count = this.items().length;
      untracked(() => {
        if (count < this.previousCount) {
          this.heading()?.nativeElement.focus();
        }
        this.previousCount = count;
      });
    });
  }

  protected reload(): void {
    if (this.favorites.status() === 'error') {
      void this.favorites.retry();
    }
    if (this.catalogState().status === 'error') {
      this.load();
    }
  }

  protected stayLabel(entry: TourEntry): string {
    const stay = entry.accommodation;
    return stay ? `${accommodationTypeLabel(stay.type)} · ${stay.name}` : '';
  }

  private load(): void {
    this.subscription?.unsubscribe();
    this.catalogState.set({ status: 'loading' });
    this.subscription = forkJoin({
      tours: this.catalog.getTours(),
      accommodations: this.catalog.getAccommodations(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tours, accommodations }) =>
          this.catalogState.set({ status: 'ready', entries: buildEntries(tours, accommodations) }),
        error: () => this.catalogState.set({ status: 'error' }),
      });
  }
}
