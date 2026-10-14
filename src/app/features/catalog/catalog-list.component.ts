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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { Continent } from '../../core/models/continent.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { DestinationCardComponent } from '../../shared/destination-card/destination-card.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import {
  CatalogFilters,
  DEFAULT_FILTERS,
  SORT_OPTIONS,
  SortKey,
  TourEntry,
  accommodationTypeLabel,
  applyFilters,
  buildEntries,
  continentOptions,
  countryOptions,
  formatDuration,
  formatPrice,
  hasActiveFilters,
  parseFilters,
  priceCeiling,
  toQueryParams,
  typeOptions,
} from './catalog-filters';

/** Nombre de circuits affichés par lot (« Voir plus »). */
const PAGE_SIZE = 9;

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: TourEntry[]; continents: Continent[] };

type ChipKey = 'query' | 'favorites' | 'continent' | 'country' | 'type' | 'maxPrice';

/** Délai avant de répercuter la saisie dans l'URL. */
const SEARCH_DEBOUNCE_MS = 250;

interface FilterChip {
  key: ChipKey;
  label: string;
}

/** Catalogue des circuits : filtres et tri synchronisés avec les query params de l'URL. */
@Component({
  selector: 'app-catalog-list',
  imports: [DestinationCardComponent, EmptyStateComponent, PageHeaderComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="contenu" tabindex="-1" class="focus:outline-none">
      <app-page-header
        eyebrow="Catalogue"
        title="Nos destinations"
        description="Filtrez par continent, pays, budget ou type d’hébergement pour trouver le circuit qui vous ressemble."
      />

      <div class="container-page section-tight">
        @if (state().status === 'ready') {
          <!-- Barre de filtres : repliable sous 768 px. -->
          <section aria-label="Recherche, filtres et tri">
            <form
              role="search"
              class="mb-4"
              aria-label="Rechercher un circuit"
              (submit)="submitSearch($event)"
            >
              <label for="f-query" class="field-label">Rechercher un circuit ou un pays</label>
              <div class="relative">
                <svg
                  viewBox="0 0 24 24"
                  class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4.5 4.5" />
                </svg>
                <input
                  #searchInput
                  id="f-query"
                  type="search"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Paris, Kenya, safari…"
                  class="field-input field-input-icon pr-12 [&::-webkit-search-cancel-button]:hidden"
                  [value]="searchText()"
                  (input)="onSearchInput($event)"
                />
                @if (searchText() !== '') {
                  <button
                    type="button"
                    class="field-toggle"
                    aria-label="Effacer la recherche"
                    (click)="clearSearch()"
                  >
                    <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                      <path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </button>
                }
              </div>
            </form>

            <button
              type="button"
              class="btn-outline btn-sm w-full justify-between md:hidden"
              aria-controls="catalog-filters"
              [attr.aria-expanded]="filtersOpen()"
              (click)="toggleFilters()"
            >
              <span class="inline-flex items-center gap-2">
                <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                  <path d="M3 5h14M6 10h8M8.5 15h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
                Filtres et tri
                @if (chips().length > 0) {
                  <span class="badge-neutral">{{ chips().length }}</span>
                }
              </span>
              <svg
                viewBox="0 0 20 20"
                class="h-4 w-4 transition-transform motion-reduce:transition-none"
                [class.rotate-180]="filtersOpen()"
                aria-hidden="true"
              >
                <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <form
              id="catalog-filters"
              class="mt-3 gap-4 rounded-panel bg-white p-4 shadow-soft ring-1 ring-ocean-100 sm:grid-cols-2 sm:p-6 md:mt-0 lg:grid-cols-5"
              [class]="filtersOpen() ? 'grid' : 'hidden md:grid'"
              aria-label="Filtrer les circuits"
              (submit)="$event.preventDefault()"
            >
              <div>
                <label for="f-continent" class="field-label">Continent</label>
                <select
                  id="f-continent"
                  class="field-input"
                  [value]="filters().continent"
                  (change)="setContinent($event)"
                >
                  <option value="">Tous</option>
                  @for (name of continentList(); track name) {
                    <option [value]="name" [selected]="name === filters().continent">{{ name }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="f-country" class="field-label">Pays</label>
                <select
                  id="f-country"
                  class="field-input"
                  [value]="filters().country"
                  (change)="setCountry($event)"
                >
                  <option value="">Tous</option>
                  @for (name of countryList(); track name) {
                    <option [value]="name" [selected]="name === filters().country">{{ name }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="f-type" class="field-label">Hébergement</label>
                <select
                  id="f-type"
                  class="field-input"
                  [value]="filters().type"
                  (change)="setType($event)"
                >
                  <option value="">Tous types</option>
                  @for (type of typeList(); track type) {
                    <option [value]="type" [selected]="type === filters().type">
                      {{ typeLabel(type) }}
                    </option>
                  }
                </select>
              </div>
              <div>
                <label for="f-price" class="field-label">
                  Budget max :
                  <span class="font-semibold">{{ priceLabel() }}</span>
                </label>
                <input
                  id="f-price"
                  type="range"
                  min="0"
                  step="50"
                  class="mt-3 h-6 w-full cursor-pointer accent-ocean-700"
                  [max]="ceiling()"
                  [value]="priceDraft() ?? ceiling()"
                  (input)="onPriceInput($event)"
                  (change)="commitPrice($event)"
                />
              </div>
              @if (canFilterFavorites()) {
                <div class="flex items-end sm:col-span-2 lg:col-span-5">
                  <label class="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ocean-900">
                    <input
                      id="f-favorites"
                      type="checkbox"
                      class="h-5 w-5 cursor-pointer rounded border-ocean-500 accent-ocean-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/30"
                      [checked]="filters().favoritesOnly"
                      (change)="setFavoritesOnly($event)"
                    />
                    Mes favoris seulement
                  </label>
                </div>
              }
              <div>
                <label for="f-sort" class="field-label">Trier par</label>
                <select
                  id="f-sort"
                  class="field-input"
                  [value]="filters().sort"
                  (change)="setSort($event)"
                >
                  @for (option of sortOptions; track option.value) {
                    <option [value]="option.value" [selected]="option.value === filters().sort">
                      {{ option.label }}
                    </option>
                  }
                </select>
              </div>
            </form>
          </section>
        }

        <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-medium text-ocean-800" role="status" aria-live="polite">
            @switch (state().status) {
              @case ('ready') {
                {{ resultsLabel() }}
              }
              @case ('loading') {
                Chargement des circuits…
              }
              @default {
                Circuits indisponibles
              }
            }
          </p>
        </div>

        @if (chips().length > 0) {
          <ul class="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
            @for (chip of chips(); track chip.key) {
              <li>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-ocean-100 py-1.5 pl-3 pr-2 text-sm font-medium text-ocean-900 transition-colors hover:bg-ocean-200"
                  [attr.aria-label]="'Retirer le filtre : ' + chip.label"
                  (click)="removeChip(chip.key)"
                >
                  {{ chip.label }}
                  <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                    <path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </button>
              </li>
            }
            <li>
              <button type="button" class="btn-ghost btn-sm" (click)="reset()">
                Réinitialiser
              </button>
            </li>
          </ul>
        }

        @switch (state().status) {
          @case ('loading') {
            <ul class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              @for (n of skeletons; track n) {
                <li><app-skeleton class="h-[24rem] rounded-card" /></li>
              }
            </ul>
          }
          @case ('error') {
            <app-empty-state
              class="mt-6"
              tone="error"
              icon="alert"
              [alert]="true"
              title="Impossible de charger les circuits"
              description="Une erreur est survenue pendant la lecture du catalogue. Vérifiez votre connexion puis réessayez."
            >
              <button type="button" class="btn-primary" (click)="load()">Réessayer</button>
            </app-empty-state>
          }
          @case ('ready') {
            @if (results().length === 0) {
              <app-empty-state
                class="mt-6"
                icon="search"
                [title]="emptyTitle()"
                [description]="
                  active()
                    ? 'Vérifiez l’orthographe, élargissez votre recherche ou réinitialisez les filtres.'
                    : 'Le catalogue est en cours de préparation, revenez bientôt.'
                "
              >
                @if (active()) {
                  <button type="button" class="btn-primary" (click)="reset()">
                    Réinitialiser
                  </button>
                }
              </app-empty-state>
            } @else {
              <ul class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                @for (entry of visibleResults(); track entry.tour.id) {
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
              @if (remaining() > 0) {
                <div class="mt-12 flex flex-col items-center gap-4">
                  <div class="text-center">
                    <p class="text-sm text-ocean-800">
                      {{ visibleResults().length }} sur {{ results().length }} circuits affichés
                    </p>
                    <div class="mx-auto mt-2 h-1.5 w-48 rounded-full bg-ocean-100" aria-hidden="true">
                      <div
                        class="h-full rounded-full bg-ocean-700"
                        [style.width.%]="progress()"
                      ></div>
                    </div>
                  </div>
                  <button type="button" class="btn-outline" (click)="showMore()">
                    Voir plus de circuits
                    <span class="font-normal opacity-90">({{ remaining() }} restants)</span>
                  </button>
                </div>
              }
            }
          }
        }
      </div>
    </main>
  `,
})
export class CatalogListComponent {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  /** Lecture seule : sert à savoir si le filtre « favoris » a un sens (client connecté). */
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];
  protected readonly typeLabel = accommodationTypeLabel;
  protected readonly duration = formatDuration;
  protected readonly price = formatPrice;

  protected readonly state = signal<ListState>({ status: 'loading' });
  /** Valeur du curseur pendant le glissement, avant validation. */
  protected readonly priceDraft = signal<number | null>(null);
  /** Barre de filtres dépliée (mobile uniquement : toujours visible dès 768 px). */
  protected readonly filtersOpen = signal(false);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filters = computed<CatalogFilters>(() => parseFilters(this.queryParams()));
  protected readonly active = computed(() => hasActiveFilters(this.filters()));

  private readonly entries = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.entries : [];
  });
  private readonly tours = computed(() => this.entries().map((e) => e.tour));

  protected readonly continentList = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? continentOptions(this.tours(), state.continents) : [];
  });
  protected readonly countryList = computed(() =>
    countryOptions(this.tours(), this.filters().continent),
  );
  protected readonly typeList = computed(() => typeOptions(this.entries()));
  protected readonly ceiling = computed(() => priceCeiling(this.tours()));

  /** Le filtre « Mes favoris » n'est proposé qu'à un client connecté. */
  protected readonly canFilterFavorites = computed(() => this.auth.profile()?.role === 'user');

  protected readonly results = computed(() => {
    const filters = this.filters();
    // Un visiteur ou un administrateur arrivant avec ?favoris=1 voit le catalogue complet.
    const profile = this.auth.profile();
    const useFavorites = filters.favoritesOnly && profile !== null && profile?.role !== 'admin';
    return applyFilters(
      this.entries(),
      useFavorites ? filters : { ...filters, favoritesOnly: false },
      this.favorites.ids(),
    );
  });
  /** Lot courant : revient à la première page dès que les filtres ou le tri changent. */
  private readonly expanded = signal<{ key: string; count: number }>({ key: '', count: PAGE_SIZE });
  private readonly filtersKey = computed(() => JSON.stringify(toQueryParams(this.filters())));
  private readonly visibleCount = computed(() => {
    const expanded = this.expanded();
    return expanded.key === this.filtersKey() ? expanded.count : PAGE_SIZE;
  });
  protected readonly visibleResults = computed(() => this.results().slice(0, this.visibleCount()));
  protected readonly remaining = computed(() =>
    Math.max(0, this.results().length - this.visibleCount()),
  );
  protected readonly progress = computed(() => {
    const total = this.results().length;
    return total === 0 ? 0 : Math.round((this.visibleResults().length / total) * 100);
  });

  protected readonly resultsLabel = computed(() => {
    const count = this.results().length;
    if (count === 0) {
      const query = this.filters().query;
      return query ? `Aucun résultat pour « ${query} »` : 'Aucun circuit';
    }
    const total = `${count} ${count > 1 ? 'circuits' : 'circuit'}`;
    return this.remaining() > 0 ? `${total} · ${this.visibleResults().length} affichés` : total;
  });
  protected readonly priceLabel = computed(() => {
    const value = this.priceDraft() ?? this.filters().maxPrice;
    return value === null ? 'Illimité' : formatPrice(value);
  });

  /** Puces des filtres actifs (le tri n'en fait pas partie). */
  protected readonly chips = computed<FilterChip[]>(() => {
    const { query, favoritesOnly, continent, country, type, maxPrice } = this.filters();
    const chips: FilterChip[] = [];
    if (query) {
      chips.push({ key: 'query', label: `Recherche : « ${query} »` });
    }
    if (favoritesOnly) {
      chips.push({ key: 'favorites', label: 'Mes favoris' });
    }
    if (continent) {
      chips.push({ key: 'continent', label: continent });
    }
    if (country) {
      chips.push({ key: 'country', label: country });
    }
    if (type) {
      chips.push({ key: 'type', label: accommodationTypeLabel(type) });
    }
    if (maxPrice !== null) {
      chips.push({ key: 'maxPrice', label: `Jusqu’à ${formatPrice(maxPrice)}` });
    }
    return chips;
  });

  protected readonly emptyTitle = computed(() => {
    if (!this.active()) {
      return 'Aucun circuit disponible pour le moment';
    }
    const { query, favoritesOnly } = this.filters();
    if (query) {
      return `Aucun résultat pour « ${query} »`;
    }
    return favoritesOnly && this.canFilterFavorites() && this.favorites.ids().size === 0
      ? 'Vous n’avez pas encore de favori'
      : 'Aucun circuit ne correspond à ces critères';
  });

  /** Contenu du champ de recherche (peut précéder l'URL pendant l'anti-rebond). */
  protected readonly searchText = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  /** Dernière valeur écrite dans l'URL par ce composant : sert à repérer un changement externe. */
  private committedQuery = this.filters().query;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  private subscription: Subscription | null = null;

  constructor() {
    this.load();
    // Retour arrière du navigateur, puce retirée, réinitialisation : le champ suit l'URL.
    effect(() => {
      const query = this.filters().query;
      untracked(() => {
        if (query !== this.committedQuery) {
          this.cancelSearchTimer();
          this.committedQuery = query;
          this.searchText.set(query);
        }
      });
    });
    this.destroyRef.onDestroy(() => this.cancelSearchTimer());
  }

  protected onSearchInput(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.searchText.set(value);
    this.cancelSearchTimer();
    this.searchTimer = setTimeout(() => this.commitSearch(), SEARCH_DEBOUNCE_MS);
  }

  /** Entrée dans le champ : applique tout de suite, sans attendre l'anti-rebond. */
  protected submitSearch(event: Event): void {
    event.preventDefault();
    this.cancelSearchTimer();
    this.commitSearch();
  }

  protected clearSearch(): void {
    this.cancelSearchTimer();
    this.searchText.set('');
    this.commitSearch();
    this.searchInput()?.nativeElement.focus();
  }

  private commitSearch(): void {
    this.searchTimer = null;
    const query = this.searchText().trim();
    if (query === this.filters().query) {
      return;
    }
    this.committedQuery = query;
    this.apply({ ...this.filters(), query });
  }

  private cancelSearchTimer(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  protected load(): void {
    this.subscription?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.subscription = forkJoin({
      tours: this.catalog.getTours(),
      accommodations: this.catalog.getAccommodations(),
      // L'ordre des continents est un confort : son échec ne bloque pas la page.
      continents: this.catalog.getContinents().pipe(catchError(() => of<Continent[]>([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tours, accommodations, continents }) =>
          this.state.set({
            status: 'ready',
            entries: buildEntries(tours, accommodations),
            continents,
          }),
        error: () => this.state.set({ status: 'error' }),
      });
  }

  protected stayLabel(entry: TourEntry): string {
    const stay = entry.accommodation;
    return stay ? `${accommodationTypeLabel(stay.type)} · ${stay.name}` : '';
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected setContinent(event: Event): void {
    const continent = selectValue(event);
    const current = this.filters();
    // Un pays hors du continent choisi n'a plus de sens : on le retire.
    const valid = countryOptions(this.tours(), continent).includes(current.country);
    this.apply({ ...current, continent, country: valid ? current.country : '' });
  }

  protected setCountry(event: Event): void {
    this.apply({ ...this.filters(), country: selectValue(event) });
  }

  protected setType(event: Event): void {
    this.apply({ ...this.filters(), type: selectValue(event) });
  }

  protected setFavoritesOnly(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.apply({ ...this.filters(), favoritesOnly: checked });
  }

  protected setSort(event: Event): void {
    this.apply({ ...this.filters(), sort: selectValue(event) as SortKey });
  }

  protected onPriceInput(event: Event): void {
    this.priceDraft.set(rangeValue(event));
  }

  protected commitPrice(event: Event): void {
    const value = rangeValue(event);
    this.priceDraft.set(null);
    this.apply({ ...this.filters(), maxPrice: value >= this.ceiling() ? null : value });
  }

  protected removeChip(key: ChipKey): void {
    const current = this.filters();
    switch (key) {
      case 'query':
        this.cancelSearchTimer();
        this.apply({ ...current, query: '' });
        break;
      case 'favorites':
        this.apply({ ...current, favoritesOnly: false });
        break;
      case 'continent':
        this.apply({ ...current, continent: '' });
        break;
      case 'country':
        this.apply({ ...current, country: '' });
        break;
      case 'type':
        this.apply({ ...current, type: '' });
        break;
      case 'maxPrice':
        this.priceDraft.set(null);
        this.apply({ ...current, maxPrice: null });
        break;
    }
  }

  protected showMore(): void {
    this.expanded.set({ key: this.filtersKey(), count: this.visibleCount() + PAGE_SIZE });
  }

  protected reset(): void {
    this.priceDraft.set(null);
    this.cancelSearchTimer();
    this.searchText.set('');
    this.committedQuery = '';
    this.apply({ ...DEFAULT_FILTERS, sort: this.filters().sort });
  }

  private apply(filters: CatalogFilters): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(filters),
      replaceUrl: true,
    });
  }
}

function selectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

function rangeValue(event: Event): number {
  return event.target instanceof HTMLInputElement ? Number(event.target.value) : 0;
}
