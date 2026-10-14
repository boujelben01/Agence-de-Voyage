import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  DocumentData,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
} from '@angular/fire/firestore';
import { Observable, catchError, defer, from, throwError } from 'rxjs';
import { Accommodation } from '../models/accommodation.model';
import { Continent } from '../models/continent.model';
import { Tour } from '../models/tour.model';

/** Erreur de lecture du catalogue, avec un message affichable. */
export class CatalogError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}

/** Lecture seule du catalogue (continents, circuits, hébergements). */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  getTours(max?: number): Observable<Tour[]> {
    return this.read('Impossible de charger les circuits.', async () => {
      const source = collection(this.firestore, 'tours');
      const snapshot = await getDocs(max === undefined ? source : query(source, limit(max)));
      return snapshot.docs.map((d) => toTour(d.id, d.data()));
    });
  }

  /** Renvoie null si le circuit n'existe pas. */
  getTour(id: string): Observable<Tour | null> {
    return this.read('Impossible de charger ce circuit.', async () => {
      const snapshot = await getDoc(doc(this.firestore, 'tours', id));
      return snapshot.exists() ? toTour(snapshot.id, snapshot.data()) : null;
    });
  }

  getAccommodations(): Observable<Accommodation[]> {
    return this.read('Impossible de charger les hébergements.', async () => {
      const snapshot = await getDocs(collection(this.firestore, 'accommodations'));
      return snapshot.docs.map((d) => toAccommodation(d.id, d.data()));
    });
  }

  /** Renvoie null si l'hébergement n'existe pas. */
  getAccommodation(id: string): Observable<Accommodation | null> {
    return this.read("Impossible de charger l'hébergement.", async () => {
      const snapshot = await getDoc(doc(this.firestore, 'accommodations', id));
      return snapshot.exists() ? toAccommodation(snapshot.id, snapshot.data()) : null;
    });
  }

  getContinents(): Observable<Continent[]> {
    return this.read('Impossible de charger les continents.', async () => {
      const snapshot = await getDocs(collection(this.firestore, 'continents'));
      return snapshot.docs.map((d) => toContinent(d.id, d.data()));
    });
  }

  /**
   * Exécute la lecture dans le contexte d'injection (requis par AngularFire pour doc()/collection())
   * et convertit toute erreur Firestore en CatalogError.
   */
  private read<T>(message: string, action: () => Promise<T>): Observable<T> {
    return defer(() => from(runInInjectionContext(this.injector, action))).pipe(
      catchError((error: unknown) => throwError(() => new CatalogError(message, error))),
    );
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function toTour(id: string, data: DocumentData): Tour {
  return {
    id,
    title: text(data['title']),
    country: text(data['country']),
    continent: text(data['continent']),
    price: num(data['price']),
    duration: num(data['duration']),
    image: text(data['image']),
    description: text(data['description']),
    itinerary: textList(data['itinerary']),
    accommodationId: text(data['accommodationId']),
  };
}

export function toAccommodation(id: string, data: DocumentData): Accommodation {
  return {
    id,
    name: text(data['name']),
    country: text(data['country']),
    city: text(data['city']),
    type: text(data['type']),
    pricePerNight: num(data['pricePerNight']),
    stars: num(data['stars']),
    image: text(data['image']),
    availableFrom: text(data['availableFrom']),
    availableTo: text(data['availableTo']),
  };
}

export function toContinent(id: string, data: DocumentData): Continent {
  return { id, name: text(data['name']), countries: textList(data['countries']) };
}
