import { Reservation } from '../../core/models/reservation.model';
import {
  barWidth,
  latestReservations,
  revenueByMonth,
  summarize,
  topDestinations,
} from './admin-stats';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r',
    userId: 'u1',
    userEmail: 'u@test.com',
    tourId: '1',
    tourTitle: 'Circuit A',
    tourImage: 'images/a.jpg',
    country: 'France',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    travelers: 2,
    pricePerPerson: 500,
    totalPrice: 1000,
    status: 'confirmed',
    createdAt: new Date('2026-06-10T10:00:00Z'),
    ...overrides,
  };
}

describe('summarize', () => {
  it("compte les statuts et ignore les réservations annulées dans le chiffre d'affaires", () => {
    const list = [
      reservation({ id: 'a', totalPrice: 1000 }),
      reservation({ id: 'b', totalPrice: 500 }),
      reservation({ id: 'c', totalPrice: 9999, status: 'cancelled' }),
    ];
    expect(summarize(list, 8, 29)).toEqual({
      confirmed: 2,
      cancelled: 1,
      revenue: 1500,
      tours: 8,
      accommodations: 29,
    });
  });

  it('renvoie des zéros sans réservation', () => {
    expect(summarize([], 0, 0)).toEqual({
      confirmed: 0,
      cancelled: 0,
      revenue: 0,
      tours: 0,
      accommodations: 0,
    });
  });
});

describe('topDestinations', () => {
  it('classe par nombre de réservations confirmées, sans les annulées', () => {
    const list = [
      reservation({ id: '1', tourId: 'p', tourTitle: 'Paris' }),
      reservation({ id: '2', tourId: 'p', tourTitle: 'Paris' }),
      reservation({ id: '3', tourId: 'r', tourTitle: 'Rome' }),
      reservation({ id: '4', tourId: 'r', tourTitle: 'Rome', status: 'cancelled' }),
      reservation({ id: '5', tourId: 'r', tourTitle: 'Rome', status: 'cancelled' }),
      reservation({ id: '6', tourId: 'k', tourTitle: 'Kenya', status: 'cancelled' }),
    ];
    const top = topDestinations(list);
    expect(top.map((t) => [t.title, t.count])).toEqual([
      ['Paris', 2],
      ['Rome', 1],
    ]);
  });

  it('limite à 5 et départage les égalités par le titre', () => {
    const list = ['F', 'E', 'D', 'C', 'B', 'A'].map((title) =>
      reservation({ id: title, tourId: title, tourTitle: `Circuit ${title}` }),
    );
    const top = topDestinations(list, 5);
    expect(top).toHaveLength(5);
    expect(top.map((t) => t.title)).toEqual([
      'Circuit A',
      'Circuit B',
      'Circuit C',
      'Circuit D',
      'Circuit E',
    ]);
  });
});

describe('revenueByMonth', () => {
  const NOW = new Date('2026-10-15T12:00:00Z');

  it('produit 6 mois consécutifs, du plus ancien au mois courant', () => {
    const months = revenueByMonth([], NOW, 6);
    expect(months.map((m) => m.key)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(months.every((m) => m.total === 0)).toBe(true);
  });

  it('additionne les réservations confirmées par mois de création et ignore le reste', () => {
    const list = [
      reservation({ id: 'a', totalPrice: 1000, createdAt: new Date('2026-10-02T09:00:00Z') }),
      reservation({ id: 'b', totalPrice: 250, createdAt: new Date('2026-10-20T09:00:00Z') }),
      reservation({ id: 'c', totalPrice: 700, createdAt: new Date('2026-08-05T09:00:00Z') }),
      reservation({ id: 'd', totalPrice: 5000, status: 'cancelled', createdAt: new Date('2026-10-03T09:00:00Z') }),
      reservation({ id: 'e', totalPrice: 300, createdAt: new Date('2025-01-01T09:00:00Z') }),
      reservation({ id: 'f', totalPrice: 400, createdAt: null }),
    ];
    const byKey = Object.fromEntries(revenueByMonth(list, NOW, 6).map((m) => [m.key, m.total]));
    expect(byKey['2026-10']).toBe(1250);
    expect(byKey['2026-08']).toBe(700);
    expect(Object.values(byKey).reduce((a, b) => a + b, 0)).toBe(1950);
  });

  it('gère le passage d’année', () => {
    const months = revenueByMonth([], new Date('2026-02-10T00:00:00Z'), 4);
    expect(months.map((m) => m.key)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('latestReservations', () => {
  it('trie par date de création décroissante et limite', () => {
    const list = [
      reservation({ id: 'old', createdAt: new Date('2026-01-01T00:00:00Z') }),
      reservation({ id: 'new', createdAt: new Date('2026-09-01T00:00:00Z') }),
      reservation({ id: 'mid', createdAt: new Date('2026-05-01T00:00:00Z') }),
    ];
    expect(latestReservations(list, 2).map((r) => r.id)).toEqual(['new', 'mid']);
  });
});

describe('barWidth', () => {
  it('calcule un pourcentage borné', () => {
    expect(barWidth(5, 10)).toBe(50);
    expect(barWidth(10, 10)).toBe(100);
    expect(barWidth(3, 0)).toBe(0);
    expect(barWidth(0, 10)).toBe(0);
  });
});
