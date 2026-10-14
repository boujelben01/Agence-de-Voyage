import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Reservation } from '../../core/models/reservation.model';
import { Tour } from '../../core/models/tour.model';
import { AdminError, AdminService, TourInput } from '../../core/services/admin.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AccommodationsAdminComponent } from './accommodations-admin.component';
import { DashboardComponent } from './dashboard.component';
import { ReservationsAdminComponent } from './reservations-admin.component';
import { ToursAdminComponent } from './tours-admin.component';
import { TourFormComponent } from './tour-form.component';

const continents: Continent[] = [
  { id: 'c1', name: 'Europe', countries: ['France', 'Italie'] },
  { id: 'c2', name: 'Afrique', countries: ['Kenya'] },
];

function tour(id: string, overrides: Partial<Tour> = {}): Tour {
  return {
    id,
    title: `Circuit ${id}`,
    country: 'France',
    continent: 'Europe',
    price: 1000,
    duration: 3,
    image: 'images/paris.jpg',
    description: 'Description.',
    itinerary: ['a', 'b', 'c'],
    accommodationId: 'a1',
    ...overrides,
  };
}

function accommodation(id: string, overrides: Partial<Accommodation> = {}): Accommodation {
  return {
    id,
    name: `Hébergement ${id}`,
    country: 'France',
    city: 'Paris',
    type: 'Hotel',
    pricePerNight: 100,
    stars: 4,
    image: 'images/hotellouvre.jpg',
    availableFrom: '2026-01-01',
    availableTo: '2027-12-31',
    ...overrides,
  };
}

function reservation(id: string, overrides: Partial<Reservation> = {}): Reservation {
  return {
    id,
    userId: 'u1',
    userEmail: 'ada@test.com',
    tourId: '1',
    tourTitle: 'Romance à Paris',
    tourImage: 'images/paris.jpg',
    country: 'France',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    travelers: 2,
    pricePerPerson: 500,
    totalPrice: 1000,
    status: 'confirmed',
    createdAt: new Date(),
    ...overrides,
  };
}

interface Mocks {
  tours?: Observable<Tour[]>;
  accommodations?: Observable<Accommodation[]>;
  continents?: Observable<Continent[]>;
  reservations?: Observable<Reservation[]>;
  deleteAccommodation?: (id: string) => Observable<void>;
  deleteTour?: (id: string) => Observable<void>;
  cancelReservation?: (id: string) => Observable<void>;
}

async function render<T>(component: Type<T>, mocks: Mocks = {}) {
  const spies = {
    deleteAccommodation: vi.fn(mocks.deleteAccommodation ?? (() => of(undefined))),
    deleteTour: vi.fn(mocks.deleteTour ?? (() => of(undefined))),
    cancelReservation: vi.fn(mocks.cancelReservation ?? (() => of(undefined))),
  };
  const catalog: Partial<CatalogService> = {
    getTours: () => mocks.tours ?? of([]),
    getAccommodations: () => mocks.accommodations ?? of([]),
    getContinents: () => mocks.continents ?? of(continents),
  };
  const admin: Partial<AdminService> = {
    listAllReservations: () => mocks.reservations ?? of([]),
    deleteAccommodation: spies.deleteAccommodation,
    deleteTour: spies.deleteTour,
    cancelReservation: spies.cancelReservation,
  };
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: CatalogService, useValue: catalog },
      { provide: AdminService, useValue: admin },
    ],
  });
  const fixture = TestBed.createComponent(component);
  await settle(fixture);
  return { fixture, root: fixture.nativeElement as HTMLElement, spies, toast: TestBed.inject(ToastService) };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').replace(/\s+/g, ' ').includes(label),
  );
  if (!found) {
    throw new Error(`bouton introuvable : ${label}`);
  }
  return found;
}

function text(root: HTMLElement): string {
  return (root.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('DashboardComponent', () => {
  it("affiche le chiffre d'affaires des seules réservations confirmées", async () => {
    const { root } = await render(DashboardComponent, {
      reservations: of([
        reservation('a', { totalPrice: 1000 }),
        reservation('b', { totalPrice: 500 }),
        reservation('c', { totalPrice: 7777, status: 'cancelled' }),
      ]),
      tours: of([tour('1'), tour('2')]),
      accommodations: of([accommodation('a1')]),
    });
    const content = text(root);
    expect(content.replace(/\s/g, '')).toContain('1500€');
    expect(content).not.toContain('7777');
    expect(content).toContain('Destinations les plus réservées');
    expect(content).toContain('Romance à Paris');
  });

  it('affiche des états vides sans réservation', async () => {
    const { root } = await render(DashboardComponent);
    expect(text(root)).toContain('Aucune réservation confirmée pour le moment');
    expect(text(root)).toContain('Aucune réservation pour le moment');
  });

  it("affiche l'état d'erreur avec le message du service", async () => {
    const { root } = await render(DashboardComponent, {
      reservations: throwError(() => new AdminError('Lecture refusée.')),
    });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Lecture refusée.');
  });
});

describe('ToursAdminComponent', () => {
  it("affiche l'état vide du catalogue", async () => {
    const { root } = await render(ToursAdminComponent);
    expect(text(root)).toContain('Aucun circuit dans le catalogue');
  });

  it("affiche l'état d'erreur", async () => {
    const { root } = await render(ToursAdminComponent, {
      tours: throwError(() => new Error('Chargement impossible.')),
    });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Chargement impossible.');
  });

  it('filtre la liste avec la recherche', async () => {
    const { fixture, root } = await render(ToursAdminComponent, {
      tours: of([tour('1', { title: 'Paris' }), tour('2', { title: 'Safari', country: 'Kenya' })]),
    });
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    const search = root.querySelector<HTMLInputElement>('#tour-search');
    if (!search) {
      throw new Error('champ de recherche introuvable');
    }
    search.value = 'kenya';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(text(root)).toContain('Safari');
  });

  it("précise que les réservations existantes gardent leur snapshot avant suppression", async () => {
    const { fixture, root, spies } = await render(ToursAdminComponent, {
      tours: of([tour('1', { title: 'Paris' })]),
    });
    button(root, 'Supprimer').click();
    await settle(fixture);
    expect(text(root)).toContain('conservent leur snapshot');
    expect(spies.deleteTour).not.toHaveBeenCalled();

    button(root, 'Oui, supprimer').click();
    await settle(fixture);
    expect(spies.deleteTour).toHaveBeenCalledWith('1');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});

describe('TourFormComponent', () => {
  async function renderForm() {
    TestBed.configureTestingModule({ imports: [TourFormComponent] });
    const fixture = TestBed.createComponent(TourFormComponent);
    fixture.componentRef.setInput('continents', continents);
    fixture.componentRef.setInput('accommodations', [accommodation('a1')]);
    const saved: TourInput[] = [];
    fixture.componentInstance.saved.subscribe((value) => saved.push(value));
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    const set = async (id: string, value: string, eventName: 'input' | 'change'): Promise<void> => {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`);
      if (!el) {
        throw new Error(`champ introuvable : ${id}`);
      }
      el.value = value;
      el.dispatchEvent(new Event(eventName, { bubbles: true }));
      await settle(fixture);
    };

    await set('tour-title', 'Romance à Paris', 'input');
    await set('tour-continent', 'Europe', 'change');
    await set('tour-country', 'France', 'change');
    await set('tour-price', '980', 'input');
    await set('tour-duration', '3', 'input');
    await set('tour-accommodation', 'a1', 'change');
    await set('tour-image', 'images/paris.jpg', 'change');
    await set('tour-description', 'Un séjour romantique.', 'input');
    return { fixture, root, saved, set };
  }

  const submit = (root: HTMLElement): void => {
    root.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };

  it("refuse un itinéraire dont le nombre de lignes diffère de la durée et affiche le compteur", async () => {
    const { fixture, root, saved, set } = await renderForm();
    await set('tour-itinerary', 'Jour un\nJour deux', 'input');
    submit(root);
    await settle(fixture);

    expect(saved).toHaveLength(0);
    expect(root.querySelector('#tour-itinerary-error')?.textContent).toContain('exactement 3 jours');
    expect((root.querySelector('#tour-itinerary-count')?.textContent ?? '').replace(/\s+/g, ' ')).toContain('2 jours renseignés sur 3 attendus');
    expect(root.querySelector('#tour-itinerary')?.getAttribute('aria-invalid')).toBe('true');
  });

  it("accepte l'itinéraire quand le nombre de lignes égale la durée", async () => {
    const { fixture, root, saved, set } = await renderForm();
    await set('tour-itinerary', 'Jour un\nJour deux\nJour trois', 'input');
    submit(root);
    await settle(fixture);

    expect(saved).toHaveLength(1);
    expect(saved[0].itinerary).toEqual(['Jour un', 'Jour deux', 'Jour trois']);
    expect(saved[0]).toMatchObject({ price: 980, duration: 3, accommodationId: 'a1', country: 'France' });
    expect('id' in saved[0]).toBe(false);
  });

  it('refuse un prix nul et une durée hors bornes', async () => {
    const { fixture, root, saved, set } = await renderForm();
    await set('tour-itinerary', 'a\nb\nc', 'input');
    await set('tour-price', '0', 'input');
    await set('tour-duration', '31', 'input');
    submit(root);
    await settle(fixture);

    expect(saved).toHaveLength(0);
    expect(root.querySelector('#tour-price-error')?.textContent).toContain('supérieur à 0');
    expect(root.querySelector('#tour-duration-error')?.textContent).toContain('entre 1 et 30');
  });

  it("ne propose que les hébergements du pays choisi", async () => {
    const { root } = await renderForm();
    const options = Array.from(root.querySelectorAll('#tour-accommodation option')).map(
      (o) => o.getAttribute('value'),
    );
    expect(options).toEqual(['', 'a1']);
  });
});

describe('AccommodationsAdminComponent', () => {
  const tours = [tour('1', { title: 'Romance à Paris', accommodationId: 'a1' })];

  it("refuse la suppression d'un hébergement utilisé et nomme le circuit", async () => {
    const { fixture, root, spies } = await render(AccommodationsAdminComponent, {
      accommodations: of([accommodation('a1', { name: 'Hôtel utilisé' })]),
      tours: of(tours),
    });
    button(root, 'Supprimer').click();
    await settle(fixture);

    expect(text(root)).toContain('Suppression impossible');
    expect(text(root)).toContain('« Romance à Paris »');
    expect(() => button(root, 'Oui, supprimer')).toThrow();
    expect(spies.deleteAccommodation).not.toHaveBeenCalled();
  });

  it("supprime un hébergement inutilisé après confirmation", async () => {
    const { fixture, root, spies, toast } = await render(AccommodationsAdminComponent, {
      accommodations: of([accommodation('a2', { name: 'Hôtel libre' })]),
      tours: of(tours),
    });
    button(root, 'Supprimer').click();
    await settle(fixture);
    expect(spies.deleteAccommodation).not.toHaveBeenCalled();

    button(root, 'Oui, supprimer').click();
    await settle(fixture);
    expect(spies.deleteAccommodation).toHaveBeenCalledWith('a2');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(toast.toasts().at(-1)?.kind).toBe('success');
  });

  it("affiche un toast d'erreur si le service refuse la suppression", async () => {
    const { fixture, root, toast } = await render(AccommodationsAdminComponent, {
      accommodations: of([accommodation('a2')]),
      deleteAccommodation: () => throwError(() => new AdminError('Refusé par le serveur.')),
    });
    button(root, 'Supprimer').click();
    await settle(fixture);
    button(root, 'Oui, supprimer').click();
    await settle(fixture);

    expect(toast.toasts().at(-1)).toMatchObject({ kind: 'error', message: 'Refusé par le serveur.' });
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it("affiche les états vide et erreur", async () => {
    const empty = await render(AccommodationsAdminComponent);
    expect(text(empty.root)).toContain('Aucun hébergement dans le catalogue');
    TestBed.resetTestingModule();

    const failed = await render(AccommodationsAdminComponent, {
      accommodations: throwError(() => new Error('Lecture impossible.')),
    });
    expect(failed.root.querySelector('[role="alert"]')?.textContent).toContain('Lecture impossible.');
  });
});

describe('ReservationsAdminComponent', () => {
  it('liste les réservations et filtre par statut', async () => {
    const { fixture, root } = await render(ReservationsAdminComponent, {
      reservations: of([
        reservation('r1'),
        reservation('r2', { status: 'cancelled', userEmail: 'bob@test.com' }),
      ]),
    });
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);

    const select = root.querySelector<HTMLSelectElement>('#res-status');
    if (!select) {
      throw new Error('filtre de statut introuvable');
    }
    select.value = 'cancelled';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(text(root)).toContain('bob@test.com');
  });

  it("n'offre aucune suppression et annule après confirmation", async () => {
    const { fixture, root, spies, toast } = await render(ReservationsAdminComponent, {
      reservations: of([reservation('r1')]),
    });
    expect(Array.from(root.querySelectorAll('button')).some((b) => /supprim/i.test(b.textContent ?? ''))).toBe(false);

    button(root, 'Annuler').click();
    await settle(fixture);
    expect(spies.cancelReservation).not.toHaveBeenCalled();

    button(root, 'Oui, annuler').click();
    await settle(fixture);
    expect(spies.cancelReservation).toHaveBeenCalledWith('r1');
    expect(text(root)).toContain('Annulée');
    expect(toast.toasts().at(-1)?.kind).toBe('success');
  });

  it('affiche les états vide et erreur', async () => {
    const empty = await render(ReservationsAdminComponent);
    expect(text(empty.root)).toContain('Aucune réservation pour le moment');
    TestBed.resetTestingModule();

    const failed = await render(ReservationsAdminComponent, {
      reservations: throwError(() => new AdminError('Lecture refusée.')),
    });
    expect(failed.root.querySelector('[role="alert"]')?.textContent).toContain('Lecture refusée.');
  });
});
