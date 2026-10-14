import { Reservation } from '../../core/models/reservation.model';

export interface Summary {
  confirmed: number;
  cancelled: number;
  /** Somme des totalPrice des réservations confirmées uniquement. */
  revenue: number;
  tours: number;
  accommodations: number;
}

export interface DestinationRank {
  tourId: string;
  title: string;
  country: string;
  count: number;
}

export interface MonthRevenue {
  /** AAAA-MM (UTC). */
  key: string;
  label: string;
  total: number;
}

export function summarize(
  reservations: readonly Reservation[],
  tours: number,
  accommodations: number,
): Summary {
  let confirmed = 0;
  let cancelled = 0;
  let revenue = 0;
  for (const r of reservations) {
    if (r.status === 'confirmed') {
      confirmed++;
      revenue += r.totalPrice;
    } else {
      cancelled++;
    }
  }
  return { confirmed, cancelled, revenue, tours, accommodations };
}

/**
 * Circuits les plus réservés : seules les réservations confirmées comptent. Égalité départagée
 * par le titre pour un classement stable.
 */
export function topDestinations(
  reservations: readonly Reservation[],
  limit = 5,
): DestinationRank[] {
  const byTour = new Map<string, DestinationRank>();
  for (const r of reservations) {
    if (r.status !== 'confirmed') {
      continue;
    }
    const entry = byTour.get(r.tourId);
    if (entry) {
      entry.count++;
    } else {
      byTour.set(r.tourId, { tourId: r.tourId, title: r.tourTitle, country: r.country, count: 1 });
    }
  }
  return [...byTour.values()]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'fr'))
    .slice(0, limit);
}

const monthFormat = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Chiffre d'affaires par mois de réservation (date de création, UTC) sur les `months` derniers
 * mois, mois courant inclus, du plus ancien au plus récent. Seules les réservations confirmées
 * comptent ; une réservation sans date de création est ignorée.
 */
export function revenueByMonth(
  reservations: readonly Reservation[],
  now: Date = new Date(),
  months = 6,
): MonthRevenue[] {
  const buckets: MonthRevenue[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ key: monthKey(date), label: monthFormat.format(date), total: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const r of reservations) {
    if (r.status !== 'confirmed' || r.createdAt === null) {
      continue;
    }
    const bucket = index.get(monthKey(r.createdAt));
    if (bucket) {
      bucket.total += r.totalPrice;
    }
  }
  return buckets;
}

/** Les plus récentes d'abord (date de création, à défaut date de départ). */
export function latestReservations(
  reservations: readonly Reservation[],
  limit = 5,
): Reservation[] {
  const stamp = (r: Reservation): number =>
    r.createdAt !== null ? r.createdAt.getTime() : (Date.parse(r.startDate) || 0);
  return [...reservations].sort((a, b) => stamp(b) - stamp(a)).slice(0, limit);
}

/** Largeur de barre en pourcentage (0..100) ; 0 si le maximum est nul. */
export function barWidth(value: number, max: number): number {
  if (max <= 0 || value <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / max) * 100));
}
