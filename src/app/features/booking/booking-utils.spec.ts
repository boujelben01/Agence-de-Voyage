import {
  addDays,
  computeEndDate,
  computeTotal,
  formatTravelers,
  parseIsoDate,
  todayIso,
  tomorrowIso,
  validateStartDate,
  validateTravelers,
} from './booking-utils';

const NOW = new Date(2026, 5, 15, 14, 30); // 15 juin 2026, heure locale

describe('dates', () => {
  it('parse uniquement des dates ISO valides', () => {
    expect(parseIsoDate('2026-02-28')).not.toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('15/06/2026')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  it('ajoute des jours en gérant les fins de mois et d’année', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('nope', 1)).toBeNull();
  });

  it('calcule aujourd’hui et demain en calendrier local', () => {
    expect(todayIso(NOW)).toBe('2026-06-15');
    expect(tomorrowIso(NOW)).toBe('2026-06-16');
    expect(tomorrowIso(new Date(2026, 11, 31, 23, 59))).toBe('2027-01-01');
  });
});

describe('computeEndDate', () => {
  it('vaut départ + durée − 1 jour', () => {
    expect(computeEndDate('2026-07-01', 5)).toBe('2026-07-05');
    expect(computeEndDate('2026-07-01', 1)).toBe('2026-07-01');
    expect(computeEndDate('2026-12-29', 10)).toBe('2027-01-07');
  });

  it('renvoie null pour une durée ou une date invalide', () => {
    expect(computeEndDate('2026-07-01', 0)).toBeNull();
    expect(computeEndDate('2026-07-01', 2.5)).toBeNull();
    expect(computeEndDate('invalide', 3)).toBeNull();
  });
});

describe('computeTotal', () => {
  it('multiplie le prix par le nombre de voyageurs', () => {
    expect(computeTotal(980, 3)).toBe(2940);
    expect(computeTotal(850, 1)).toBe(850);
  });
});

describe('validateStartDate', () => {
  it('refuse une date vide, invalide, passée ou égale à aujourd’hui', () => {
    expect(validateStartDate('', NOW)).toBe('Choisissez une date de départ.');
    expect(validateStartDate('2026-13-40', NOW)).toBe('La date de départ est invalide.');
    expect(validateStartDate('2026-06-14', NOW)).toContain('à partir de demain');
    expect(validateStartDate('2026-06-15', NOW)).toContain('à partir de demain');
  });

  it('accepte demain et les dates futures', () => {
    expect(validateStartDate('2026-06-16', NOW)).toBeNull();
    expect(validateStartDate('2027-01-01', NOW)).toBeNull();
  });
});

describe('validateTravelers', () => {
  it('accepte les entiers de 1 à 10', () => {
    expect(validateTravelers(1)).toBeNull();
    expect(validateTravelers(10)).toBeNull();
  });

  it('refuse null, NaN, décimaux et valeurs hors bornes', () => {
    expect(validateTravelers(null)).not.toBeNull();
    expect(validateTravelers(Number.NaN)).not.toBeNull();
    expect(validateTravelers(2.5)).toContain('entier');
    expect(validateTravelers(0)).toContain('entre 1 et 10');
    expect(validateTravelers(11)).toContain('entre 1 et 10');
  });
});

describe('formatTravelers', () => {
  it('accorde le pluriel', () => {
    expect(formatTravelers(1)).toBe('1 voyageur');
    expect(formatTravelers(4)).toBe('4 voyageurs');
  });
});
