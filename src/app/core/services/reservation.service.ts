import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  DocumentData,
  Firestore,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, catchError, defer, from, throwError } from 'rxjs';
import {
  computeEndDate,
  computeTotal,
  validateStartDate,
  validateTravelers,
} from '../../features/booking/booking-utils';
import { Reservation, ReservationStatus } from '../models/reservation.model';
import { Tour } from '../models/tour.model';

/** Erreur de réservation avec un message directement affichable. */
export class ReservationError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

/** Document écrit dans Firestore (l'id est celui du document, createdAt est posé par le serveur). */
export type ReservationDocument = Omit<Reservation, 'id' | 'createdAt'>;

export interface SessionUser {
  uid: string;
  email: string;
}

/**
 * Construit le document de réservation. Le total est toujours recalculé ici, à partir du prix du
 * circuit, jamais repris de l'interface.
 */
export function buildReservationDocument(
  tour: Tour,
  startDate: string,
  travelers: number,
  user: SessionUser,
  now: Date = new Date(),
): ReservationDocument {
  const startError = validateStartDate(startDate, now);
  if (startError) {
    throw new ReservationError(startError);
  }
  const travelersError = validateTravelers(travelers);
  if (travelersError) {
    throw new ReservationError(travelersError);
  }
  const endDate = computeEndDate(startDate, tour.duration);
  if (endDate === null) {
    throw new ReservationError('La durée de ce circuit est invalide.');
  }
  return {
    userId: user.uid,
    userEmail: user.email,
    tourId: tour.id,
    tourTitle: tour.title,
    tourImage: tour.image,
    country: tour.country,
    startDate,
    endDate,
    travelers,
    pricePerPerson: tour.price,
    totalPrice: computeTotal(tour.price, travelers),
    status: 'confirmed',
  };
}

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  /** Crée la réservation et renvoie son id. */
  create(tour: Tour, startDate: string, travelers: number): Observable<string> {
    return this.run('Impossible de confirmer la réservation. Veuillez réessayer.', async () => {
      const user = this.currentUser();
      const data = buildReservationDocument(tour, startDate, travelers, user);
      const ref = await addDoc(collection(this.firestore, 'reservations'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    });
  }

  /** Réservations de l'utilisateur connecté, la plus lointaine en premier. */
  listMine(): Observable<Reservation[]> {
    return this.run('Impossible de charger vos réservations.', async () => {
      const user = this.currentUser();
      const snapshot = await getDocs(
        query(collection(this.firestore, 'reservations'), where('userId', '==', user.uid)),
      );
      const list = snapshot.docs.map((d) => toReservation(d.id, d.data()));
      return list.sort((a, b) => b.startDate.localeCompare(a.startDate));
    });
  }

  /** Renvoie null si la réservation n'existe pas ou n'appartient pas à l'utilisateur connecté. */
  getMine(id: string): Observable<Reservation | null> {
    return this.run('Impossible de charger cette réservation.', async () => {
      const user = this.currentUser();
      try {
        const snapshot = await getDoc(doc(this.firestore, 'reservations', id));
        if (!snapshot.exists()) {
          return null;
        }
        const reservation = toReservation(snapshot.id, snapshot.data());
        return reservation.userId === user.uid ? reservation : null;
      } catch (error) {
        // Pour un document inexistant ou d'un autre utilisateur, les règles répondent « refusé ».
        if (errorCode(error) === 'permission-denied') {
          return null;
        }
        throw error;
      }
    });
  }

  /** N'écrit que le statut : les règles Firestore refusent toute autre modification. */
  cancel(id: string): Observable<void> {
    return this.run("Impossible d'annuler la réservation. Veuillez réessayer.", async () => {
      await updateDoc(doc(this.firestore, 'reservations', id), { status: 'cancelled' });
    });
  }

  private currentUser(): SessionUser {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new ReservationError('Vous devez être connecté pour effectuer cette action.');
    }
    return { uid: user.uid, email: user.email };
  }

  /** Exécute dans le contexte d'injection et convertit toute erreur en ReservationError. */
  private run<T>(fallbackMessage: string, action: () => Promise<T>): Observable<T> {
    return defer(() => from(runInInjectionContext(this.injector, action))).pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof ReservationError
            ? error
            : new ReservationError(messageFor(error, fallbackMessage), error),
        ),
      ),
    );
  }
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

function messageFor(error: unknown, fallback: string): string {
  switch (errorCode(error)) {
    case 'permission-denied':
      return "Cette action n'est pas autorisée pour votre compte.";
    case 'unavailable':
      return 'Connexion indisponible. Vérifiez votre réseau puis réessayez.';
    default:
      return fallback;
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function status(value: unknown): ReservationStatus {
  return value === 'cancelled' ? 'cancelled' : 'confirmed';
}

export function toReservation(id: string, data: DocumentData): Reservation {
  const created: unknown = data['createdAt'];
  return {
    id,
    userId: text(data['userId']),
    userEmail: text(data['userEmail']),
    tourId: text(data['tourId']),
    tourTitle: text(data['tourTitle']),
    tourImage: text(data['tourImage']),
    country: text(data['country']),
    startDate: text(data['startDate']),
    endDate: text(data['endDate']),
    travelers: num(data['travelers']),
    pricePerPerson: num(data['pricePerPerson']),
    totalPrice: num(data['totalPrice']),
    status: status(data['status']),
    createdAt: created instanceof Timestamp ? created.toDate() : null,
  };
}
