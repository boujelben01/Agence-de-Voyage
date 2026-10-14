import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Tour } from '../../core/models/tour.model';
import {
  CatalogFilters,
  DEFAULT_FILTERS,
  applyFilters,
  buildEntries,
  continentOptions,
  countryOptions,
  filterEntries,
  formatDate,
  formatDuration,
  hasActiveFilters,
  matchesQuery,
  normalizeText,
  parseFilters,
  priceCeiling,
  sortEntries,
  toQueryParams,
  typeOptions,
} from './catalog-filters';

function tour(id: string, overrides: Partial<Tour> = {}): Tour {
  return {
    id,
    title: `Circuit ${id}`,
    country: 'France',
    continent: 'Europe',
    price: 1000,
    duration: 5,
    image: 'images/x.jpg',
    description: '',
    itinerary: [],
    accommodationId: 'a1',
    ...overrides,
  };
}

function stay(id: string, type: string): Accommodation {
  return {
    id,
    name: `Hébergement ${id}`,
    country: 'France',
    city: 'Paris',
    type,
    pricePerNight: 100,
    stars: 3,
    image: 'images/y.jpg',
    availableFrom: '2025-01-01',
    availableTo: '2025-12-31',
  };
}

const tours: Tour[] = [
  tour('1', { country: 'France', continent: 'Europe', price: 980, duration: 5, accommodationId: 'a1' }),
  tour('2', { country: 'Kenya', continent: 'Afrique', price: 1500, duration: 6, accommodationId: 'a2' }),
  tour('3', { country: 'Italie', continent: 'Europe', price: 1400, duration: 10, accommodationId: 'a3' }),
  tour('4', { country: 'Pérou', continent: 'Amérique', price: 1100, duration: 7, accommodationId: 'zz' }),
];
const accommodations = [stay('a1', 'Hotel'), stay('a2', 'Camping'), stay('a3', 'Hotel')];
const entries = buildEntries(tours, accommodations);

function ids(list: typeof entries): string[] {
  return list.map((e) => e.tour.id);
}

function filters(overrides: Partial<CatalogFilters>): CatalogFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe('buildEntries', () => {
  it("associe l'hébergement, ou null s'il est introuvable", () => {
    expect(entries[0].accommodation?.id).toBe('a1');
    expect(entries[3].accommodation).toBeNull();
  });
});

describe('filterEntries', () => {
  it('ne filtre rien par défaut', () => {
    expect(ids(filterEntries(entries, DEFAULT_FILTERS))).toEqual(['1', '2', '3', '4']);
  });

  it('filtre par continent', () => {
    expect(ids(filterEntries(entries, filters({ continent: 'Europe' })))).toEqual(['1', '3']);
  });

  it('filtre par pays', () => {
    expect(ids(filterEntries(entries, filters({ country: 'Kenya' })))).toEqual(['2']);
  });

  it('filtre par prix maximum, borne incluse', () => {
    expect(ids(filterEntries(entries, filters({ maxPrice: 1100 })))).toEqual(['1', '4']);
  });

  it("filtre par type d'hébergement et exclut les circuits sans hébergement", () => {
    expect(ids(filterEntries(entries, filters({ type: 'Hotel' })))).toEqual(['1', '3']);
  });

  it('combine les critères', () => {
    const result = filterEntries(entries, filters({ continent: 'Europe', maxPrice: 1000, type: 'Hotel' }));
    expect(ids(result)).toEqual(['1']);
  });

  it('renvoie une liste vide si rien ne correspond', () => {
    expect(filterEntries(entries, filters({ country: 'Japon' }))).toEqual([]);
  });
});

describe('normalizeText', () => {
  it('retire accents, casse et espaces superflus', () => {
    expect(normalizeText('  ÉQUATEUR   Île  ')).toBe('equateur ile');
  });
});

describe('matchesQuery', () => {
  const rich = buildEntries(
    [
      tour('1', {
        title: 'Romance à Paris',
        country: 'France',
        continent: 'Europe',
        description: 'Un séjour romantique au bord de la Seine.',
        accommodationId: 'a1',
      }),
      tour('2', { title: 'Safari au Kenya', country: 'Kenya', continent: 'Afrique', accommodationId: 'a2' }),
    ],
    [
      { ...stay('a1', 'Hotel'), name: 'Hôtel du Louvre', city: 'Paris' },
      { ...stay('a2', 'Camping'), name: 'Camp Savane', city: 'Nairobi' },
    ],
  );

  it('ignore la casse et les accents, dans la requête comme dans les données', () => {
    expect(matchesQuery(rich[0], 'PARIS')).toBe(true);
    expect(matchesQuery(rich[0], 'sejour romantique')).toBe(true);
    expect(matchesQuery(rich[0], 'hotel du louvre')).toBe(true);
    expect(matchesQuery(rich[1], 'afrique')).toBe(true);
  });

  it('exige chaque mot, dans des champs éventuellement différents', () => {
    expect(matchesQuery(rich[0], 'paris france europe')).toBe(true);
    expect(matchesQuery(rich[0], 'paris kenya')).toBe(false);
    expect(matchesQuery(rich[1], 'safari nairobi')).toBe(true);
  });

  it('accepte une requête vide ou faite d’espaces', () => {
    expect(matchesQuery(rich[0], '')).toBe(true);
    expect(matchesQuery(rich[0], '   ')).toBe(true);
  });

  it('ne renvoie rien si aucun circuit ne correspond', () => {
    expect(filterEntries(rich, filters({ query: 'zzz' }))).toEqual([]);
    expect(ids(filterEntries(rich, filters({ query: 'kenya' })))).toEqual(['2']);
  });

  it('gère un circuit sans hébergement', () => {
    const lone = buildEntries([tour('9', { title: 'Escapade' })], []);
    expect(matchesQuery(lone[0], 'escapade')).toBe(true);
    expect(matchesQuery(lone[0], 'louvre')).toBe(false);
  });
});

describe('filtre favoris', () => {
  it('ne garde que les circuits favoris quand le filtre est actif', () => {
    const favorites = new Set(['2', '4']);
    expect(ids(filterEntries(entries, filters({ favoritesOnly: true }), favorites))).toEqual(['2', '4']);
    expect(ids(filterEntries(entries, DEFAULT_FILTERS, favorites))).toEqual(['1', '2', '3', '4']);
  });

  it('renvoie une liste vide sans favoris connus', () => {
    expect(filterEntries(entries, filters({ favoritesOnly: true }))).toEqual([]);
    expect(filterEntries(entries, filters({ favoritesOnly: true }), new Set())).toEqual([]);
  });

  it('se combine avec les autres critères et le tri', () => {
    const result = applyFilters(
      entries,
      filters({ favoritesOnly: true, continent: 'Europe', sort: 'price-desc' }),
      new Set(['1', '2', '3']),
    );
    expect(ids(result)).toEqual(['3', '1']);
  });
});

describe('sortEntries', () => {
  it("conserve l'ordre d'origine pour « recommended »", () => {
    expect(ids(sortEntries(entries, 'recommended'))).toEqual(['1', '2', '3', '4']);
  });

  it('trie par prix croissant et décroissant', () => {
    expect(ids(sortEntries(entries, 'price-asc'))).toEqual(['1', '4', '3', '2']);
    expect(ids(sortEntries(entries, 'price-desc'))).toEqual(['2', '3', '4', '1']);
  });

  it('trie par durée', () => {
    expect(ids(sortEntries(entries, 'duration-asc'))).toEqual(['1', '2', '4', '3']);
    expect(ids(sortEntries(entries, 'duration-desc'))).toEqual(['3', '4', '2', '1']);
  });

  it("ne modifie pas le tableau d'entrée", () => {
    sortEntries(entries, 'price-desc');
    expect(ids(entries)).toEqual(['1', '2', '3', '4']);
  });
});

describe('applyFilters', () => {
  it('filtre puis trie', () => {
    const result = applyFilters(entries, filters({ continent: 'Europe', sort: 'price-desc' }));
    expect(ids(result)).toEqual(['3', '1']);
  });
});

describe('options de filtres', () => {
  const continents: Continent[] = [
    { id: 'c1', name: 'Europe', countries: [] },
    { id: 'c2', name: 'Afrique', countries: [] },
    { id: 'c3', name: 'Océanie', countries: [] },
  ];

  it("liste les continents présents, dans l'ordre du catalogue, puis les inconnus", () => {
    expect(continentOptions(tours, continents)).toEqual(['Europe', 'Afrique', 'Amérique']);
  });

  it('restreint les pays au continent choisi', () => {
    expect(countryOptions(tours, 'Europe')).toEqual(['France', 'Italie']);
    expect(countryOptions(tours, '')).toEqual(['France', 'Italie', 'Kenya', 'Pérou']);
  });

  it("liste les types d'hébergement sans doublon", () => {
    expect(typeOptions(entries)).toEqual(['Camping', 'Hotel']);
  });

  it('arrondit le plafond de prix à la centaine supérieure', () => {
    expect(priceCeiling(tours)).toBe(1500);
    expect(priceCeiling([tour('x', { price: 1501 })])).toBe(1600);
    expect(priceCeiling([])).toBe(100);
  });
});

describe('query params', () => {
  function params(values: Record<string, string>): { get(name: string): string | null } {
    return { get: (name) => values[name] ?? null };
  }

  it('lit les filtres depuis les query params', () => {
    const parsed = parseFilters(
      params({ continent: 'Europe', pays: 'France', prix: '1200', type: 'Hotel', tri: 'price-asc' }),
    );
    expect(parsed).toEqual({
      continent: 'Europe',
      country: 'France',
      maxPrice: 1200,
      type: 'Hotel',
      query: '',
      favoritesOnly: false,
      sort: 'price-asc',
    });
  });

  it('retombe sur les valeurs par défaut si les valeurs sont invalides', () => {
    expect(parseFilters(params({ prix: 'abc', tri: 'nimportequoi' }))).toEqual(DEFAULT_FILTERS);
    expect(parseFilters(params({ prix: '-5' })).maxPrice).toBeNull();
    expect(parseFilters(params({}))).toEqual(DEFAULT_FILTERS);
  });

  it('omet les valeurs par défaut dans les query params', () => {
    expect(toQueryParams(DEFAULT_FILTERS)).toEqual({
      continent: null,
      pays: null,
      prix: null,
      type: null,
      q: null,
      favoris: null,
      tri: null,
    });
    expect(toQueryParams(filters({ country: 'Kenya', maxPrice: 900, sort: 'duration-desc' }))).toEqual({
      continent: null,
      pays: 'Kenya',
      prix: '900',
      type: null,
      q: null,
      favoris: null,
      tri: 'duration-desc',
    });
  });

  it('lit et écrit « favoris seulement » via favoris=1', () => {
    expect(parseFilters(params({ favoris: '1' })).favoritesOnly).toBe(true);
    expect(parseFilters(params({ favoris: '0' })).favoritesOnly).toBe(false);
    expect(parseFilters(params({})).favoritesOnly).toBe(false);
    expect(toQueryParams(filters({ favoritesOnly: true }))['favoris']).toBe('1');
    expect(toQueryParams(filters({ favoritesOnly: false }))['favoris']).toBeNull();
    expect(hasActiveFilters(filters({ favoritesOnly: true }))).toBe(true);
  });

  it('lit et écrit la recherche via le paramètre q', () => {
    expect(parseFilters(params({ q: '  safari  ' })).query).toBe('safari');
    expect(toQueryParams(filters({ query: 'Pérou' }))['q']).toBe('Pérou');
    expect(toQueryParams(filters({ query: '   ' }))['q']).toBeNull();
  });

  it('détecte les filtres actifs (le tri ne compte pas)', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ sort: 'price-asc' }))).toBe(false);
    expect(hasActiveFilters(filters({ maxPrice: 500 }))).toBe(true);
    expect(hasActiveFilters(filters({ query: 'paris' }))).toBe(true);
    expect(hasActiveFilters(filters({ query: '  ' }))).toBe(false);
  });
});

describe('formats', () => {
  it('accorde la durée', () => {
    expect(formatDuration(1)).toBe('1 jour');
    expect(formatDuration(5)).toBe('5 jours');
  });

  it('formate une date ISO en français', () => {
    expect(formatDate('2025-05-10')).toBe('10 mai 2025');
    expect(formatDate('pas-une-date')).toBe('pas-une-date');
  });
});
