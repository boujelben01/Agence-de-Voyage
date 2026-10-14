import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Tour } from '../../core/models/tour.model';

export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc';

export interface CatalogFilters {
  continent: string;
  country: string;
  /** null = pas de plafond. */
  maxPrice: number | null;
  /** Type d'hébergement ('Hotel', 'Maison', 'Camping'), '' = tous. */
  type: string;
  /** Recherche texte libre, '' = aucune. */
  query: string;
  /** Ne garder que les circuits favoris de l'utilisateur. */
  favoritesOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  continent: '',
  country: '',
  maxPrice: null,
  type: '',
  query: '',
  favoritesOnly: false,
  sort: 'recommended',
};

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommandés' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'duration-asc', label: 'Durée : la plus courte' },
  { value: 'duration-desc', label: 'Durée : la plus longue' },
];

const ACCOMMODATION_TYPE_LABELS: Record<string, string> = {
  Hotel: 'Hôtel',
  Maison: 'Maison',
  Camping: 'Camping',
};

export function accommodationTypeLabel(type: string): string {
  return ACCOMMODATION_TYPE_LABELS[type] ?? type;
}

/** Un circuit accompagné de son hébergement (null si introuvable). */
export interface TourEntry {
  tour: Tour;
  accommodation: Accommodation | null;
}

export function buildEntries(
  tours: readonly Tour[],
  accommodations: readonly Accommodation[],
): TourEntry[] {
  const byId = new Map(accommodations.map((a) => [a.id, a]));
  return tours.map((tour) => ({ tour, accommodation: byId.get(tour.accommodationId) ?? null }));
}

/** Minuscules, sans accents, espaces multiples réduits et bords retirés. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Recherche texte : chaque mot de la requête doit apparaître dans le titre, le pays, le continent,
 * la description ou le nom/la ville de l'hébergement. Une requête vide correspond à tout.
 */
export function matchesQuery(entry: TourEntry, query: string): boolean {
  const normalized = normalizeText(query);
  if (normalized === '') {
    return true;
  }
  const { tour, accommodation } = entry;
  const haystack = normalizeText(
    [
      tour.title,
      tour.country,
      tour.continent,
      tour.description,
      accommodation?.name ?? '',
      accommodation?.city ?? '',
    ].join(' '),
  );
  return normalized.split(' ').every((word) => haystack.includes(word));
}

/**
 * @param favoriteIds ids des circuits favoris, utilisés quand `filters.favoritesOnly` est actif
 *   (absent = aucun favori connu).
 */
export function filterEntries(
  entries: readonly TourEntry[],
  filters: CatalogFilters,
  favoriteIds?: ReadonlySet<string>,
): TourEntry[] {
  return entries.filter((entry) => {
    const { tour, accommodation } = entry;
    if (filters.favoritesOnly && !favoriteIds?.has(tour.id)) {
      return false;
    }
    if (filters.continent && tour.continent !== filters.continent) {
      return false;
    }
    if (filters.country && tour.country !== filters.country) {
      return false;
    }
    if (filters.maxPrice !== null && tour.price > filters.maxPrice) {
      return false;
    }
    if (filters.type && accommodation?.type !== filters.type) {
      return false;
    }
    return matchesQuery(entry, filters.query);
  });
}

/** Tri stable ; « recommended » conserve l'ordre d'origine. */
export function sortEntries(entries: readonly TourEntry[], sort: SortKey): TourEntry[] {
  const copy = [...entries];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.tour.price - b.tour.price);
    case 'price-desc':
      return copy.sort((a, b) => b.tour.price - a.tour.price);
    case 'duration-asc':
      return copy.sort((a, b) => a.tour.duration - b.tour.duration);
    case 'duration-desc':
      return copy.sort((a, b) => b.tour.duration - a.tour.duration);
    default:
      return copy;
  }
}

export function applyFilters(
  entries: readonly TourEntry[],
  filters: CatalogFilters,
  favoriteIds?: ReadonlySet<string>,
): TourEntry[] {
  return sortEntries(filterEntries(entries, filters, favoriteIds), filters.sort);
}

/** Continents ayant au moins un circuit, dans l'ordre du catalogue puis les éventuels inconnus. */
export function continentOptions(tours: readonly Tour[], continents: readonly Continent[]): string[] {
  const present = new Set(tours.map((t) => t.continent).filter((c) => c !== ''));
  const ordered = continents.map((c) => c.name).filter((name) => present.has(name));
  const rest = [...present].filter((name) => !ordered.includes(name)).sort(byFrench);
  return [...ordered, ...rest];
}

/** Pays ayant au moins un circuit, restreints au continent choisi. */
export function countryOptions(tours: readonly Tour[], continent: string): string[] {
  const countries = tours
    .filter((t) => !continent || t.continent === continent)
    .map((t) => t.country)
    .filter((c) => c !== '');
  return [...new Set(countries)].sort(byFrench);
}

export function typeOptions(entries: readonly TourEntry[]): string[] {
  const types = entries.map((e) => e.accommodation?.type).filter((t): t is string => !!t);
  return [...new Set(types)].sort(byFrench);
}

/** Plafond du curseur de prix : prix max arrondi à la centaine supérieure. */
export function priceCeiling(tours: readonly Tour[]): number {
  const max = tours.reduce((acc, t) => Math.max(acc, t.price), 0);
  return Math.max(100, Math.ceil(max / 100) * 100);
}

const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((o) => o.value));

/** Lit les filtres depuis des query params ; toute valeur invalide retombe sur la valeur par défaut. */
export function parseFilters(params: { get(name: string): string | null }): CatalogFilters {
  const rawPrice = params.get('prix');
  const price = rawPrice === null || rawPrice.trim() === '' ? NaN : Number(rawPrice);
  const sort = params.get('tri') ?? '';
  return {
    continent: params.get('continent') ?? '',
    country: params.get('pays') ?? '',
    maxPrice: Number.isFinite(price) && price > 0 ? price : null,
    type: params.get('type') ?? '',
    query: (params.get('q') ?? '').trim(),
    favoritesOnly: params.get('favoris') === '1',
    sort: SORT_KEYS.has(sort) ? (sort as SortKey) : 'recommended',
  };
}

/** Query params correspondants ; les valeurs par défaut sont omises (null) pour garder l'URL propre. */
export function toQueryParams(filters: CatalogFilters): Record<string, string | null> {
  return {
    continent: filters.continent || null,
    pays: filters.country || null,
    prix: filters.maxPrice === null ? null : String(filters.maxPrice),
    type: filters.type || null,
    q: filters.query.trim() || null,
    favoris: filters.favoritesOnly ? '1' : null,
    tri: filters.sort === 'recommended' ? null : filters.sort,
  };
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.continent !== '' ||
    filters.country !== '' ||
    filters.maxPrice !== null ||
    filters.type !== '' ||
    filters.query.trim() !== '' ||
    filters.favoritesOnly
  );
}

const priceFormat = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** « 2025-05-10 » → « 10 mai 2025 » ; une date invalide est renvoyée telle quelle. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : dateFormat.format(date);
}

export function formatDuration(days: number): string {
  return `${days} ${days > 1 ? 'jours' : 'jour'}`;
}

function byFrench(a: string, b: string): number {
  return a.localeCompare(b, 'fr');
}
