import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Accommodation } from '../../core/models/accommodation.model';
import { Tour } from '../../core/models/tour.model';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { CatalogDetailComponent } from './catalog-detail.component';

const tour: Tour = {
  id: '2',
  title: 'Romance à Paris',
  country: 'France',
  continent: 'Europe',
  price: 980,
  duration: 5,
  image: 'images/paris.jpg',
  description: 'Un séjour romantique au cœur de Paris.',
  itinerary: ['Arrivée et croisière.', 'Tour Eiffel et Louvre.'],
  accommodationId: '1',
};

const stay: Accommodation = {
  id: '1',
  name: 'Hôtel du Louvre',
  country: 'France',
  city: 'Paris',
  type: 'Hotel',
  pricePerNight: 121,
  stars: 4,
  image: 'images/hotellouvre.jpg',
  availableFrom: '2025-05-10',
  availableTo: '2025-12-31',
};

function render(
  tour$: Observable<Tour | null>,
  stay$: Observable<Accommodation | null> = of(stay),
  profile: UserProfile | null = null,
) {
  const service: Partial<CatalogService> = {
    getTour: () => tour$,
    getAccommodation: () => stay$,
  };
  TestBed.configureTestingModule({
    imports: [CatalogDetailComponent],
    providers: [
      provideRouter([]),
      { provide: CatalogService, useValue: service },
      { provide: AuthService, useValue: { profile: signal<UserProfile | null>(profile) } },
      {
        provide: FavoritesService,
        useValue: { ids: signal<ReadonlySet<string>>(new Set()), toggle: vi.fn() },
      },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '2' })), snapshot: { paramMap: convertToParamMap({ id: '2' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(CatalogDetailComponent);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: { nativeElement: unknown }): string {
  return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('CatalogDetailComponent', () => {
  it("affiche le circuit, l'itinéraire et l'hébergement", async () => {
    const fixture = render(of(tour));
    await fixture.whenStable();
    fixture.detectChanges();

    const content = text(fixture);
    expect(content).toContain('Romance à Paris');
    expect(content).toContain('Jour 1');
    expect(content).toContain('Jour 2');
    expect(content).toContain('Hôtel du Louvre');
    const link = (fixture.nativeElement as HTMLElement).querySelector('aside a');
    expect(link?.getAttribute('href')).toBe('/reservation/2');
    expect(link?.textContent).toContain('Réserver');
  });

  it("affiche une 404 propre quand l'id n'existe pas", async () => {
    const fixture = render(of(null));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Ce circuit n’existe pas');
  });

  it("affiche l'état d'erreur si la lecture échoue", async () => {
    const fixture = render(throwError(() => new Error('boom')));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Impossible de charger ce circuit');
  });

  it("affiche le circuit même si l'hébergement est indisponible", async () => {
    const fixture = render(of(tour), throwError(() => new Error('boom')));
    await fixture.whenStable();
    fixture.detectChanges();

    const content = text(fixture);
    expect(content).toContain('Romance à Paris');
    expect(content).toContain('Les informations d’hébergement ne sont pas disponibles');
  });

  it("remplace « Réserver » par une mention pour un compte administrateur", async () => {
    const admin: UserProfile = { uid: 'a1', email: 'a@test.com', name: 'Admin', role: 'admin' };
    const fixture = render(of(tour), of(stay), admin);
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('aside a[href="/reservation/2"]')).toBeNull();
    expect(text(fixture)).toContain('Compte administrateur : réservation indisponible');
  });

  it('affiche « Réserver » pour un client connecté', async () => {
    const client: UserProfile = { uid: 'u1', email: 'u@test.com', name: 'Ada', role: 'user' };
    const fixture = render(of(tour), of(stay), client);
    await fixture.whenStable();
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('aside a');
    expect(link?.getAttribute('href')).toBe('/reservation/2');
  });
});
