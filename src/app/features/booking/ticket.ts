import { Reservation, ReservationStatus } from '../../core/models/reservation.model';
import { formatDate, formatPrice } from '../catalog/catalog-filters';
import { formatTravelers } from './booking-utils';

/** Données prêtes à afficher d'un billet de réservation. */
export interface Ticket {
  reference: string;
  tourTitle: string;
  country: string;
  /** Titulaire du billet (nom du profil), '' s'il est inconnu. */
  holder: string;
  /** Date de départ formatée, ex. « 1 juillet 2026 ». */
  departure: string;
  /** Date de retour formatée (dernier jour du séjour). */
  returnDate: string;
  travelers: number;
  travelersLabel: string;
  pricePerPerson: string;
  total: string;
  status: ReservationStatus;
  statusLabel: string;
  /** Date de création formatée, null tant que l'horodatage serveur n'est pas résolu. */
  issuedOn: string | null;
  /** Titre du document : nomme le fichier lors de « Enregistrer au format PDF ». */
  documentTitle: string;
}

const issueDateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Seule une réservation confirmée donne droit à un billet. */
export function isTicketAvailable(reservation: Pick<Reservation, 'status'>): boolean {
  return reservation.status === 'confirmed';
}

export function ticketDocumentTitle(reference: string): string {
  return `Billet-${reference}`;
}

export function buildTicket(reservation: Reservation, holderName: string): Ticket {
  const createdAt = reservation.createdAt;
  const validCreatedAt = createdAt !== null && !Number.isNaN(createdAt.getTime());
  return {
    reference: reservation.id,
    tourTitle: reservation.tourTitle,
    country: reservation.country,
    holder: holderName.trim(),
    departure: formatDate(reservation.startDate),
    returnDate: formatDate(reservation.endDate),
    travelers: reservation.travelers,
    travelersLabel: formatTravelers(reservation.travelers),
    pricePerPerson: formatPrice(reservation.pricePerPerson),
    total: formatPrice(reservation.totalPrice),
    status: reservation.status,
    statusLabel: reservation.status === 'confirmed' ? 'Confirmée' : 'Annulée',
    issuedOn: validCreatedAt ? issueDateFormat.format(createdAt) : null,
    documentTitle: ticketDocumentTitle(reservation.id),
  };
}
