export type ReservationStatus = 'confirmed' | 'cancelled';

/** Réservation d'un circuit ; les informations du circuit sont copiées (snapshot) à la création. */
export interface Reservation {
  /** Id du document Firestore, utilisé comme référence. */
  id: string;
  userId: string;
  userEmail: string;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  country: string;
  /** Dates ISO (AAAA-MM-JJ). */
  startDate: string;
  endDate: string;
  travelers: number;
  pricePerPerson: number;
  totalPrice: number;
  status: ReservationStatus;
  /** null tant que l'horodatage serveur n'est pas résolu. */
  createdAt: Date | null;
}
