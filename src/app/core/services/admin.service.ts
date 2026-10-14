import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, catchError, defer, from, throwError } from 'rxjs';
import { Accommodation } from '../models/accommodation.model';
import { Reservation } from '../models/reservation.model';
import { Tour } from '../models/tour.model';
import { toReservation } from './reservation.service';

/** Contenu éditable d'un circuit ou d'un hébergement : jamais d'id. */
export type TourInput = Omit<Tour, 'id'>;
export type AccommodationInput = Omit<Accommodation, 'id'>;

/** Erreur d'administration avec un message français directement affichable. */
export class AdminError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

/**
 * Copie champ par champ : l'id est porté par le document, jamais par ses données, même si
 * l'objet reçu en contient un (par exemple un `Tour` complet passé par erreur).
 */
export function toTourDocument(input: TourInput): TourInput {
  return {
    title: input.title,
    country: input.country,
    continent: input.continent,
    price: input.price,
    duration: input.duration,
    image: input.image,
    description: input.description,
    itinerary: [...input.itinerary],
    accommodationId: input.accommodationId,
  };
}

export function toAccommodationDocument(input: AccommodationInput): AccommodationInput {
  return {
    name: input.name,
    country: input.country,
    city: input.city,
    type: input.type,
    pricePerNight: input.pricePerNight,
    stars: input.stars,
    image: input.image,
    availableFrom: input.availableFrom,
    availableTo: input.availableTo,
  };
}

/** Écritures du catalogue et lecture des réservations, réservées à l'administrateur (règles Firestore). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  createTour(input: TourInput): Observable<string> {
    return this.run('Impossible de créer le circuit.', async () => {
      const ref = await addDoc(collection(this.firestore, 'tours'), toTourDocument(input));
      return ref.id;
    });
  }

  updateTour(id: string, input: TourInput): Observable<void> {
    return this.run('Impossible de modifier le circuit.', async () => {
      await setDoc(doc(this.firestore, 'tours', id), toTourDocument(input));
    });
  }

  deleteTour(id: string): Observable<void> {
    return this.run('Impossible de supprimer le circuit.', async () => {
      await deleteDoc(doc(this.firestore, 'tours', id));
    });
  }

  createAccommodation(input: AccommodationInput): Observable<string> {
    return this.run("Impossible de créer l'hébergement.", async () => {
      const ref = await addDoc(
        collection(this.firestore, 'accommodations'),
        toAccommodationDocument(input),
      );
      return ref.id;
    });
  }

  updateAccommodation(id: string, input: AccommodationInput): Observable<void> {
    return this.run("Impossible de modifier l'hébergement.", async () => {
      await setDoc(doc(this.firestore, 'accommodations', id), toAccommodationDocument(input));
    });
  }

  /** Refuse la suppression d'un hébergement encore utilisé par un circuit (vérifié côté serveur). */
  deleteAccommodation(id: string): Observable<void> {
    return this.run("Impossible de supprimer l'hébergement.", async () => {
      const used = await getDocs(
        query(collection(this.firestore, 'tours'), where('accommodationId', '==', id), limit(1)),
      );
      const first = used.docs[0];
      if (first) {
        const title: unknown = first.data()['title'];
        throw new AdminError(
          `Cet hébergement est utilisé par le circuit « ${typeof title === 'string' ? title : first.id} ».`,
        );
      }
      await deleteDoc(doc(this.firestore, 'accommodations', id));
    });
  }

  listAllReservations(): Observable<Reservation[]> {
    return this.run('Impossible de charger les réservations.', async () => {
      const snapshot = await getDocs(collection(this.firestore, 'reservations'));
      return snapshot.docs.map((d) => toReservation(d.id, d.data()));
    });
  }

  /** N'écrit que le statut, comme pour l'annulation côté client. */
  cancelReservation(id: string): Observable<void> {
    return this.run("Impossible d'annuler la réservation.", async () => {
      await updateDoc(doc(this.firestore, 'reservations', id), { status: 'cancelled' });
    });
  }

  private run<T>(fallbackMessage: string, action: () => Promise<T>): Observable<T> {
    return defer(() => from(runInInjectionContext(this.injector, action))).pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof AdminError ? error : new AdminError(messageFor(error, fallbackMessage), error),
        ),
      ),
    );
  }
}

function messageFor(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code: unknown = (error as { code: unknown }).code;
    if (code === 'permission-denied') {
      return 'Action refusée : elle est réservée aux administrateurs.';
    }
    if (code === 'unavailable') {
      return 'Connexion indisponible. Vérifiez votre réseau puis réessayez.';
    }
  }
  return fallback;
}
