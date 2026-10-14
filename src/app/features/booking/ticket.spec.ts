import { Reservation } from '../../core/models/reservation.model';
import { buildTicket, isTicketAvailable, ticketDocumentTitle } from './ticket';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'AbC123xyz',
    userId: 'u1',
    userEmail: 'ada@test.com',
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
    createdAt: new Date('2026-06-15T12:00:00Z'),
    ...overrides,
  };
}

describe('buildTicket', () => {
  it('construit les données du billet à partir de la réservation', () => {
    const ticket = buildTicket(reservation(), '  Ada Lovelace ');

    expect(ticket.reference).toBe('AbC123xyz');
    expect(ticket.tourTitle).toBe('Romance à Paris');
    expect(ticket.country).toBe('France');
    expect(ticket.holder).toBe('Ada Lovelace');
    expect(ticket.departure).toBe('1 juillet 2026');
    expect(ticket.returnDate).toBe('5 juillet 2026');
    expect(ticket.travelers).toBe(3);
    expect(ticket.travelersLabel).toBe('3 voyageurs');
    expect(ticket.statusLabel).toBe('Confirmée');
    expect(ticket.issuedOn).toBe('15 juin 2026');
    expect(ticket.documentTitle).toBe('Billet-AbC123xyz');
  });

  it('formate les prix en euros (par personne et total)', () => {
    const ticket = buildTicket(reservation(), 'Ada');
    // L'espace avant « € » est insécable selon la locale : on compare sans espaces.
    expect(ticket.pricePerPerson.replace(/\s/g, '')).toBe('980€');
    expect(ticket.total.replace(/\s/g, '')).toBe('2940€');
  });

  it('accorde « voyageur » au singulier', () => {
    expect(buildTicket(reservation({ travelers: 1 }), '').travelersLabel).toBe('1 voyageur');
  });

  it('laisse la date de création à null tant qu’elle est inconnue', () => {
    expect(buildTicket(reservation({ createdAt: null }), 'Ada').issuedOn).toBeNull();
    expect(buildTicket(reservation({ createdAt: new Date('x') }), 'Ada').issuedOn).toBeNull();
  });

  it('gère un titulaire inconnu', () => {
    expect(buildTicket(reservation(), '   ').holder).toBe('');
  });

  it('reprend le statut annulé', () => {
    const ticket = buildTicket(reservation({ status: 'cancelled' }), 'Ada');
    expect(ticket.status).toBe('cancelled');
    expect(ticket.statusLabel).toBe('Annulée');
  });
});

describe('isTicketAvailable', () => {
  it('n’autorise le billet que pour une réservation confirmée', () => {
    expect(isTicketAvailable({ status: 'confirmed' })).toBe(true);
    expect(isTicketAvailable({ status: 'cancelled' })).toBe(false);
  });
});

describe('ticketDocumentTitle', () => {
  it('préfixe la référence par « Billet- »', () => {
    expect(ticketDocumentTitle('r1')).toBe('Billet-r1');
  });
});
