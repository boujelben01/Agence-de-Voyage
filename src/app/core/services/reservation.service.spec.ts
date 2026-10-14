import { Timestamp } from '@angular/fire/firestore';
import { Tour } from '../models/tour.model';
import {
  ReservationError,
  buildReservationDocument,
  toReservation,
} from './reservation.service';

const tour: Tour = {
  id: '2',
  title: 'Romance à Paris',
  country: 'France',
  continent: 'Europe',
  price: 980,
  duration: 5,
  image: 'images/paris.jpg',
  description: '',
  itinerary: [],
  accommodationId: '1',
};

const user = { uid: 'u1', email: 'u@test.com' };
const NOW = new Date(2026, 5, 15, 10, 0);

describe('buildReservationDocument', () => {
  it('copie les infos du circuit et calcule fin et total', () => {
    const doc = buildReservationDocument(tour, '2026-07-01', 3, user, NOW);
    expect(doc).toEqual({
      userId: 'u1',
      userEmail: 'u@test.com',
      tourId: '2',
      tourTitle: 'Romance à Paris',
      tourImage: 'images/paris.jpg',
      country: 'France',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      travelers: 3,
      pricePerPerson: 980,
      totalPrice: 2940,
      status: 'confirmed',
    });
  });

  it('refuse une date passée ou un nombre de voyageurs invalide', () => {
    expect(() => buildReservationDocument(tour, '2026-06-15', 2, user, NOW)).toThrow(
      ReservationError,
    );
    expect(() => buildReservationDocument(tour, '2026-07-01', 0, user, NOW)).toThrow(
      ReservationError,
    );
    expect(() => buildReservationDocument(tour, '2026-07-01', 11, user, NOW)).toThrow(
      ReservationError,
    );
  });

  it('refuse un circuit sans durée valide', () => {
    expect(() =>
      buildReservationDocument({ ...tour, duration: 0 }, '2026-07-01', 2, user, NOW),
    ).toThrow('durée');
  });
});

describe('toReservation', () => {
  it('convertit un document Firestore', () => {
    const created = new Date('2026-06-15T10:00:00Z');
    const result = toReservation('r1', {
      userId: 'u1',
      tourTitle: 'Romance à Paris',
      travelers: 2,
      totalPrice: 1960,
      status: 'cancelled',
      createdAt: Timestamp.fromDate(created),
    });
    expect(result.id).toBe('r1');
    expect(result.status).toBe('cancelled');
    expect(result.totalPrice).toBe(1960);
    expect(result.createdAt?.getTime()).toBe(created.getTime());
    expect(result.country).toBe('');
  });

  it('retombe sur confirmed et createdAt null si absent', () => {
    const result = toReservation('r2', {});
    expect(result.status).toBe('confirmed');
    expect(result.createdAt).toBeNull();
  });
});
