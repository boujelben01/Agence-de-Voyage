import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface SeedTour {
  id: string;
  title: string;
  country: string;
  continent: string;
  price: number;
  duration: number;
  image: string;
  description: string;
  itinerary: string[];
  accommodationId: string;
}

interface SeedAccommodation {
  id: string;
  name: string;
  country: string;
  city: string;
  type: string;
  pricePerNight: number;
  stars: number;
  image: string;
  availableFrom: string;
  availableTo: string;
}

interface SeedContinent {
  id: string;
  name: string;
  countries: string[];
}

interface Seed {
  continents: SeedContinent[];
  tours: SeedTour[];
  accommodations: SeedAccommodation[];
}

const root = process.cwd();
const seed = JSON.parse(readFileSync(join(root, 'server', 'seed-data.json'), 'utf8')) as Seed;

/** Circuits ajoutés après l'import initial : ids 10 à 21 puis 22 (Maroc). */
const NEW_TOUR_IDS = Array.from({ length: 13 }, (_, i) => String(10 + i));

/** Les hébergements d'origine utilisent des noms de pays anglais (traduits par le script de seed). */
const COUNTRY_FR: Record<string, string> = {
  Morocco: 'Maroc',
  Japan: 'Japon',
  Spain: 'Espagne',
  Brazil: 'Brésil',
  'South Africa': 'Afrique du Sud',
  'New Zealand': 'Nouvelle-Zélande',
  Peru: 'Pérou',
  Thailand: 'Thaïlande',
  Norway: 'Norvège',
  USA: 'États-Unis',
  Australia: 'Australie',
};

/** Circuits 23 à 29 : un circuit pour chacun des pays qui n'en avaient pas encore. */
const EXTRA_TOUR_IDS = Array.from({ length: 7 }, (_, i) => String(23 + i));
const ALL_ADDED_TOUR_IDS = [...NEW_TOUR_IDS, ...EXTRA_TOUR_IDS];
const frenchCountry = (name: string): string => COUNTRY_FR[name] ?? name;
const ACCOMMODATION_TYPES = ['Hotel', 'Maison', 'Camping'];

function duplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

describe('server/seed-data.json (catalogue)', () => {
  it('a des ids uniques pour les continents, circuits et hébergements', () => {
    expect(duplicates(seed.continents.map((c) => c.id))).toEqual([]);
    expect(duplicates(seed.tours.map((t) => t.id))).toEqual([]);
    expect(duplicates(seed.accommodations.map((a) => a.id))).toEqual([]);
  });

  it('contient les circuits ajoutés (ids 10 à 22) et 3 hébergements par nouveau pays', () => {
    const ids = seed.tours.map((t) => t.id);
    for (const id of NEW_TOUR_IDS) {
      expect(ids).toContain(id);
    }
    for (const id of NEW_TOUR_IDS) {
      const tour = seed.tours.find((t) => t.id === id);
      const sameCountry = seed.accommodations.filter((a) => frenchCountry(a.country) === frenchCountry(tour?.country ?? ''));
      expect(sameCountry.length, `hébergements pour ${tour?.country}`).toBe(3);
    }
  });

  it('référence pour chaque circuit un hébergement existant du même pays', () => {
    const byId = new Map(seed.accommodations.map((a) => [a.id, a]));
    for (const tour of seed.tours) {
      const accommodation = byId.get(tour.accommodationId);
      expect(accommodation, `circuit ${tour.id} : hébergement ${tour.accommodationId}`).toBeDefined();
    }
    for (const id of ALL_ADDED_TOUR_IDS) {
      const tour = seed.tours.find((t) => t.id === id);
      expect(frenchCountry(byId.get(tour?.accommodationId ?? '')?.country ?? '')).toBe(
        frenchCountry(tour?.country ?? ''),
      );
    }
  });

  it("a un itinéraire d'autant d'étapes que la durée, sans étape vide", () => {
    for (const tour of seed.tours) {
      expect(tour.itinerary.length, `circuit ${tour.id}`).toBe(tour.duration);
      for (const step of tour.itinerary) {
        expect(step.trim().length, `circuit ${tour.id}`).toBeGreaterThan(10);
      }
    }
  });

  it('respecte les bornes de durée, de prix et de type pour les nouveaux circuits et hébergements', () => {
    for (const id of NEW_TOUR_IDS) {
      const tour = seed.tours.find((t) => t.id === id);
      expect(tour?.duration).toBeGreaterThanOrEqual(4);
      expect(tour?.duration).toBeLessThanOrEqual(12);
      expect(tour?.price).toBeGreaterThanOrEqual(750);
      expect(tour?.price).toBeLessThanOrEqual(3200);
    }
    const newCountries = new Set(
      NEW_TOUR_IDS.map((id) => frenchCountry(seed.tours.find((t) => t.id === id)?.country ?? '')),
    );
    for (const a of seed.accommodations.filter((x) => newCountries.has(frenchCountry(x.country)))) {
      expect(ACCOMMODATION_TYPES).toContain(a.type);
      expect(a.pricePerNight).toBeGreaterThanOrEqual(40);
      expect(a.pricePerNight).toBeLessThanOrEqual(450);
      expect(a.stars).toBeGreaterThanOrEqual(1);
      expect(a.stars).toBeLessThanOrEqual(a.type === 'Camping' ? 3 : 5);
    }
  });

  it('a des hébergements disponibles en 2026 et 2027', () => {
    for (const a of seed.accommodations) {
      expect(a.availableFrom, `hébergement ${a.id}`).toBe('2026-01-01');
      expect(a.availableTo, `hébergement ${a.id}`).toBe('2027-12-31');
    }
  });

  it("range chaque pays de circuit dans le bon continent de la liste des continents", () => {
    const continentOf = new Map<string, string>();
    for (const c of seed.continents) {
      for (const country of c.countries) {
        continentOf.set(frenchCountry(country), c.name);
      }
    }
    const french: Record<string, string> = { Asia: 'Asie', Africa: 'Afrique', America: 'Amérique', Australia: 'Océanie' };
    const normalize = (name: string): string => french[name] ?? name;
    for (const id of ALL_ADDED_TOUR_IDS) {
      const tour = seed.tours.find((t) => t.id === id);
      expect(normalize(continentOf.get(frenchCountry(tour?.country ?? '')) ?? '')).toBe(normalize(tour?.continent ?? ''));
    }
  });

  it('ne référence que des images qui existent dans public/', () => {
    const images = [
      ...seed.tours.map((t) => t.image),
      ...seed.accommodations.map((a) => a.image),
    ];
    const missing = images.filter((image) => !existsSync(join(root, 'public', image)));
    expect([...new Set(missing)]).toEqual([]);
  });

  it('propose, pour les circuits 23 à 29, des prix et durées réalistes avec un hébergement du même pays', () => {
    const byId = new Map(seed.accommodations.map((a) => [a.id, a]));
    for (const id of EXTRA_TOUR_IDS) {
      const tour = seed.tours.find((t) => t.id === id);
      expect(tour, `circuit ${id}`).toBeDefined();
      expect(tour?.price).toBeGreaterThanOrEqual(1000);
      expect(tour?.price).toBeLessThanOrEqual(3000);
      expect(tour?.duration).toBeGreaterThanOrEqual(8);
      expect(tour?.description.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      const stay = byId.get(tour?.accommodationId ?? '');
      expect(stay?.country, `hébergement du circuit ${id}`).toBe(tour?.country);
    }
  });

  it('propose au moins un circuit pour chaque pays du catalogue', () => {
    const countriesWithTour = new Set(seed.tours.map((t) => frenchCountry(t.country)));
    const catalogueCountries = seed.continents.flatMap((c) => c.countries.map(frenchCountry));
    const missing = catalogueCountries.filter((country) => !countriesWithTour.has(country));
    expect(missing).toEqual([]);
  });
});
