export const MIN_TRAVELERS = 1;
export const MAX_TRAVELERS = 10;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse « AAAA-MM-JJ » en Date UTC ; null si le format ou le calendrier est invalide. */
export function parseIsoDate(iso: string): Date | null {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === iso ? date : null;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string | null {
  const date = parseIsoDate(iso);
  if (!date) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/** Date du jour (calendrier local) au format AAAA-MM-JJ. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Premier jour réservable : demain (calendrier local). */
export function tomorrowIso(now: Date = new Date()): string {
  return addDays(todayIso(now), 1) ?? todayIso(now);
}

/** Dernier jour du séjour : départ + durée − 1 jour. null si les entrées sont invalides. */
export function computeEndDate(startDate: string, durationDays: number): string | null {
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    return null;
  }
  return addDays(startDate, durationDays - 1);
}

/** Total = prix par personne × voyageurs. */
export function computeTotal(pricePerPerson: number, travelers: number): number {
  return pricePerPerson * travelers;
}

/** Message d'erreur, ou null si la date de départ est valide (demain ou plus tard). */
export function validateStartDate(value: string, now: Date = new Date()): string | null {
  if (value.trim() === '') {
    return 'Choisissez une date de départ.';
  }
  if (parseIsoDate(value) === null) {
    return 'La date de départ est invalide.';
  }
  if (value < tomorrowIso(now)) {
    return 'La date de départ doit être à partir de demain.';
  }
  return null;
}

/** Message d'erreur, ou null si le nombre de voyageurs est un entier entre 1 et 10. */
export function validateTravelers(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) {
    return 'Indiquez le nombre de voyageurs.';
  }
  if (!Number.isInteger(value)) {
    return 'Le nombre de voyageurs doit être un nombre entier.';
  }
  if (value < MIN_TRAVELERS || value > MAX_TRAVELERS) {
    return `Le nombre de voyageurs doit être compris entre ${MIN_TRAVELERS} et ${MAX_TRAVELERS}.`;
  }
  return null;
}

export function formatTravelers(count: number): string {
  return `${count} ${count > 1 ? 'voyageurs' : 'voyageur'}`;
}
