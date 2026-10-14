import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Reservation } from '../../core/models/reservation.model';
import { Tour } from '../../core/models/tour.model';
import {
  CATALOG_IMAGES,
  accommodationDeletionBlocker,
  availabilityError,
  countryChoices,
  filterAccommodations,
  filterReservations,
  filterTours,
  imageOptions,
  itineraryError,
  parseItinerary,
  toursUsingAccommodation,
} from './admin-forms';

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

describe('itinéraire', () => {
  it('compte une étape par ligne non vide', () => {
    expect(parseItinerary('Jour un\n\n  Jour deux  \r\nJour trois\n')).toEqual([
      'Jour un',
      'Jour deux',
      'Jour trois',
    ]);
    expect(parseItinerary('')).toEqual([]);
  });

  it('accepte un itinéraire dont le nombre de lignes égale la durée', () => {
    expect(itineraryError('a\nb\nc', 3)).toBeNull();
  });

  it('refuse un itinéraire trop court ou trop long, en donnant les nombres', () => {
    expect(itineraryError('a\nb', 3)).toContain('exactement 3 jours');
    expect(itineraryError('a\nb', 3)).toContain('2 lignes renseignées');
    expect(itineraryError('a\nb\nc\nd', 3)).toContain('4 lignes renseignées');
    expect(itineraryError('a', 1)).toBeNull();
  });

  it('demande un itinéraire tant que la durée est inconnue', () => {
    expect(itineraryError('', null)).not.toBeNull();
    expect(itineraryError('a', null)).toBeNull();
  });
});

describe('suppression d’un hébergement', () => {
  const tours = [tour('1', { title: 'Romance à Paris', accommodationId: 'a1' }), tour('2', { accommodationId: 'a2' })];

  it('refuse la suppression et nomme le circuit qui l’utilise', () => {
    const message = accommodationDeletionBlocker(tours, 'a1');
    expect(message).toContain('« Romance à Paris »');
    expect(message).toContain('Suppression impossible');
  });

  it('autorise la suppression d’un hébergement inutilisé', () => {
    expect(accommodationDeletionBlocker(tours, 'a9')).toBeNull();
    expect(toursUsingAccommodation(tours, 'a9')).toEqual([]);
  });

  it('indique le nombre d’autres circuits concernés', () => {
    const many = [
      tour('1', { title: 'A', accommodationId: 'x' }),
      tour('2', { title: 'B', accommodationId: 'x' }),
      tour('3', { title: 'C', accommodationId: 'x' }),
    ];
    expect(accommodationDeletionBlocker(many, 'x')).toContain('et 2 autres');
  });
});

describe('disponibilité', () => {
  it('exige une fin postérieure ou égale au début', () => {
    expect(availabilityError('2026-01-01', '2026-12-31')).toBeNull();
    expect(availabilityError('2026-05-01', '2026-05-01')).toBeNull();
    expect(availabilityError('2026-05-02', '2026-05-01')).toContain('postérieure');
    expect(availabilityError('', '2026-05-01')).toBeNull();
  });
});

describe('images', () => {
  it('ajoute l’image courante si elle n’est pas dans la liste', () => {
    expect(imageOptions('images/paris.jpg')).toEqual([...CATALOG_IMAGES]);
    expect(imageOptions('images/inconnue.jpg')[0]).toBe('images/inconnue.jpg');
    expect(imageOptions('')).toEqual([...CATALOG_IMAGES]);
  });
});

describe('listes', () => {
  it('filtre les circuits sans tenir compte des accents ni de la casse, puis trie', () => {
    const list = [
      tour('1', { title: 'Évasion à Rome', country: 'Italie', price: 900 }),
      tour('2', { title: 'Paris romantique', country: 'France', price: 700 }),
      tour('3', { title: 'Safari', country: 'Kenya', price: 1500 }),
    ];
    expect(filterTours(list, 'evasion', 'title').map((t) => t.id)).toEqual(['1']);
    expect(filterTours(list, 'KENYA', 'title').map((t) => t.id)).toEqual(['3']);
    expect(filterTours(list, '', 'price-asc').map((t) => t.id)).toEqual(['2', '1', '3']);
    expect(filterTours(list, '', 'price-desc').map((t) => t.id)).toEqual(['3', '1', '2']);
  });

  it('filtre et trie les hébergements', () => {
    const acc = (id: string, o: Partial<Accommodation>): Accommodation => ({
      id,
      name: `H${id}`,
      country: 'France',
      city: 'Paris',
      type: 'Hotel',
      pricePerNight: 100,
      stars: 3,
      image: 'images/h.jpg',
      availableFrom: '2026-01-01',
      availableTo: '2027-12-31',
      ...o,
    });
    const list = [acc('1', { city: 'Lyon', pricePerNight: 80 }), acc('2', { pricePerNight: 200 })];
    expect(filterAccommodations(list, 'lyon', 'name').map((a) => a.id)).toEqual(['1']);
    expect(filterAccommodations(list, '', 'price-desc').map((a) => a.id)).toEqual(['2', '1']);
  });

  it('filtre les réservations par statut puis par e-mail ou référence', () => {
    const r = (id: string, o: Partial<Reservation>): Reservation => ({
      id,
      userId: 'u',
      userEmail: 'ada@test.com',
      tourId: '1',
      tourTitle: 'T',
      tourImage: '',
      country: 'France',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      travelers: 1,
      pricePerPerson: 1,
      totalPrice: 1,
      status: 'confirmed',
      createdAt: null,
      ...o,
    });
    const list = [
      r('AbC123', { startDate: '2026-07-01' }),
      r('zzz999', { userEmail: 'bob@test.com', status: 'cancelled', startDate: '2026-09-01' }),
    ];
    expect(filterReservations(list, 'all', '').map((x) => x.id)).toEqual(['zzz999', 'AbC123']);
    expect(filterReservations(list, 'cancelled', '').map((x) => x.id)).toEqual(['zzz999']);
    expect(filterReservations(list, 'all', 'BOB').map((x) => x.id)).toEqual(['zzz999']);
    expect(filterReservations(list, 'all', 'abc1').map((x) => x.id)).toEqual(['AbC123']);
  });

  it('liste les pays, filtrés par continent', () => {
    const continents: Continent[] = [
      { id: '1', name: 'Europe', countries: ['France', 'Italie'] },
      { id: '2', name: 'Afrique', countries: ['Kenya'] },
    ];
    expect(countryChoices(continents, '')).toEqual(['France', 'Italie', 'Kenya']);
    expect(countryChoices(continents, 'Afrique')).toEqual(['Kenya']);
  });
});
