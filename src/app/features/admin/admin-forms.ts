import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Reservation, ReservationStatus } from '../../core/models/reservation.model';
import { Tour } from '../../core/models/tour.model';

export const MAX_TOUR_DURATION = 30;
export const ACCOMMODATION_TYPES = ['Hotel', 'Maison', 'Camping'] as const;
export type AccommodationType = (typeof ACCOMMODATION_TYPES)[number];

/** Libellés d'affichage des types stockés en base. */
export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationType, string> = {
  Hotel: 'Hôtel',
  Maison: 'Maison',
  Camping: 'Camping',
};

/** Fichiers disponibles dans public/images (pas d'upload : l'admin choisit parmi cette liste). */
export const CATALOG_IMAGES: readonly string[] = [
  'afrique-du-sud-le-cap.jpg', 'autralia-camp.jpg', 'autriacamp.jpg', 'baie-d-halong.jpg',
  'bali-hebergement-1.jpg', 'bali-hebergement-2.jpg', 'bali-hebergement-3.jpg', 'bali.jpg',
  'bankok.jpg', 'barcelon-hotel.jpg', 'bresil-rio.jpg', 'brezilcamp.jpg', 'canada-lac-louise.jpg',
  'capetown.jpg', 'cappadoce-hebergement-1.jpg', 'cappadoce-hebergement-2.jpg',
  'cappadoce-hebergement-3.jpg', 'cappadoce.jpg', 'capsul.jpg', 'cusco.jpg', 'default.jpg',
  'egypte-hebergement-1.jpg', 'egypte-hebergement-2.jpg', 'egypte-hebergement-3.jpg', 'egypte.jpg',
  'espagne-barcelone.jpg', 'hotelcanada.jpg', 'hotellouvre.jpg',
  'hotels-in-hanoi-old-quarter-1.jpg', 'hotwater.jpg', 'islande-hebergement-1.jpg',
  'islande-hebergement-2.jpg', 'islande-hebergement-3.jpg', 'islande.jpg', 'italie.jpg',
  'japan.jpg', 'japon-kyoto.jpg', 'kenya-camp.jpg', 'lisbonne-hebergement-1.jpg',
  'lisbonne-hebergement-2.jpg', 'lisbonne-hebergement-3.jpg', 'lisbonne.jpg',
  'maldives-hebergement-1.jpg', 'maldives-hebergement-2.jpg', 'maldives-hebergement-3.jpg',
  'maldives.jpg', 'manhaten-hotel.jpg', 'mardid.jpg', 'maroc-hebergement-1.jpg',
  'maroc-hebergement-2.jpg', 'maroc-medina.jpg', 'marrakech-maison.jpg', 'matchu.jpg',
  'montrea-dow.jpg', 'newzealandhome.jpg', 'norvege-fjords.jpg', 'norway-cabin.jpg', 'norway.jpg',
  'nouvelle-zelande-milford.jpg', 'nouvelle-zelande.jpg', 'ny-skyline.jpg', 'paris.jpg',
  'patagonie-hebergement-1.jpg', 'patagonie-hebergement-2.jpg', 'patagonie-hebergement-3.jpg',
  'patagonie.jpg', 'rajasthan-hebergement-1.jpg', 'rajasthan-hebergement-2.jpg',
  'rajasthan-hebergement-3.jpg', 'rajasthan.jpg', 'rio-de-janeiro.jpg', 'riobeach.jpg',
  'roadtrip.jpg', 'roma-hotel.jpg', 'rome-colisee.jpg', 'safari.jpg', 'santorin-hebergement-1.jpg',
  'santorin-hebergement-2.jpg', 'santorin-hebergement-3.jpg', 'santorin.jpg',
  'serengeti-hebergement-1.jpg', 'serengeti-hebergement-2.jpg', 'serengeti-hebergement-3.jpg',
  'serengeti.jpg', 'sidi-bou-said-hebergement-1.jpg', 'sidi-bou-said-hebergement-2.jpg',
  'sidi-bou-said-hebergement-3.jpg', 'sidi-bou-said.jpg', 'southcamp.jpg', 'thailand.jpg',
  'thailandhouse.jpg', 'venice.jpg', 'versaille.jpg', 'vietnam-ha-long.jpg', 'vitnamehotel.jpg',
  'yello.jpg', 'yucatan-hebergement-1.jpg', 'yucatan-hebergement-2.jpg',
  'yucatan-hebergement-3.jpg', 'yucatan.jpg',
].map((file) => `images/${file}`);

/** Options d'image : la liste du catalogue, plus l'image courante si elle n'y figure pas. */
export function imageOptions(current: string): string[] {
  return current !== '' && !CATALOG_IMAGES.includes(current)
    ? [current, ...CATALOG_IMAGES]
    : [...CATALOG_IMAGES];
}

// ---------- Itinéraire ----------

/** Une étape par ligne non vide. */
export function parseItinerary(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** Message d'erreur si le nombre de lignes n'est pas égal à la durée, sinon null. */
export function itineraryError(text: string, duration: number | null): string | null {
  const steps = parseItinerary(text).length;
  if (duration === null || !Number.isInteger(duration) || duration < 1) {
    return steps === 0 ? 'Renseignez l’itinéraire, un jour par ligne.' : null;
  }
  if (steps !== duration) {
    return `L’itinéraire doit compter exactement ${duration} ${duration > 1 ? 'jours' : 'jour'} (une ligne par jour) : ${steps} ligne${steps > 1 ? 's' : ''} renseignée${steps > 1 ? 's' : ''}.`;
  }
  return null;
}

// ---------- Hébergements ----------

/** Circuits qui utilisent encore l'hébergement donné. */
export function toursUsingAccommodation(tours: readonly Tour[], accommodationId: string): Tour[] {
  return tours.filter((t) => t.accommodationId === accommodationId);
}

/** Message de refus si l'hébergement est encore utilisé, sinon null. */
export function accommodationDeletionBlocker(
  tours: readonly Tour[],
  accommodationId: string,
): string | null {
  const used = toursUsingAccommodation(tours, accommodationId);
  if (used.length === 0) {
    return null;
  }
  const [first] = used;
  const more = used.length > 1 ? ` (et ${used.length - 1} autre${used.length > 2 ? 's' : ''})` : '';
  return `Suppression impossible : cet hébergement est utilisé par le circuit « ${first.title} »${more}. Modifiez d’abord ce circuit.`;
}

/** Message d'erreur si la fin précède le début, sinon null. */
export function availabilityError(from: string, to: string): string | null {
  if (from !== '' && to !== '' && to < from) {
    return 'La date de fin doit être postérieure ou égale à la date de début.';
  }
  return null;
}

// ---------- Listes ----------

export type TourSort = 'title' | 'price-asc' | 'price-desc' | 'duration';

export const TOUR_SORTS: readonly { value: TourSort; label: string }[] = [
  { value: 'title', label: 'Titre (A → Z)' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'duration', label: 'Durée' },
];

function norm(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function filterTours(tours: readonly Tour[], search: string, sort: TourSort): Tour[] {
  const q = norm(search);
  const list = tours.filter(
    (t) => q === '' || norm(t.title).includes(q) || norm(t.country).includes(q),
  );
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'duration':
      return list.sort((a, b) => a.duration - b.duration);
    default:
      return list.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }
}

export type AccommodationSort = 'name' | 'country' | 'price-asc' | 'price-desc';

export const ACCOMMODATION_SORTS: readonly { value: AccommodationSort; label: string }[] = [
  { value: 'name', label: 'Nom (A → Z)' },
  { value: 'country', label: 'Pays' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
];

export function filterAccommodations(
  list: readonly Accommodation[],
  search: string,
  sort: AccommodationSort,
): Accommodation[] {
  const q = norm(search);
  const out = list.filter(
    (a) =>
      q === '' || norm(a.name).includes(q) || norm(a.country).includes(q) || norm(a.city).includes(q),
  );
  switch (sort) {
    case 'country':
      return out.sort((a, b) => a.country.localeCompare(b.country, 'fr') || a.name.localeCompare(b.name, 'fr'));
    case 'price-asc':
      return out.sort((a, b) => a.pricePerNight - b.pricePerNight);
    case 'price-desc':
      return out.sort((a, b) => b.pricePerNight - a.pricePerNight);
    default:
      return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
}

export type StatusFilter = 'all' | ReservationStatus;

/** Filtre par statut puis recherche par e-mail ou référence ; départ le plus récent d'abord. */
export function filterReservations(
  list: readonly Reservation[],
  status: StatusFilter,
  search: string,
): Reservation[] {
  const q = search.trim().toLowerCase();
  return list
    .filter((r) => status === 'all' || r.status === status)
    .filter(
      (r) => q === '' || r.userEmail.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/** Pays proposés dans les formulaires : ceux des continents, triés ; filtrés par continent si donné. */
export function countryChoices(continents: readonly Continent[], continentName: string): string[] {
  const source = continentName
    ? continents.filter((c) => c.name === continentName)
    : [...continents];
  return [...new Set(source.flatMap((c) => c.countries))].sort((a, b) => a.localeCompare(b, 'fr'));
}
