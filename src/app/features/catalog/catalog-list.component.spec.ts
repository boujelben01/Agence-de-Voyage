import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Tour } from '../../core/models/tour.model';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { CatalogListComponent } from './catalog-list.component';

const sampleTour: Tour = {
  id: '2',
  title: 'Romance à Paris',
  country: 'France',
  continent: 'Europe',
  price: 980,
  duration: 5,
  image: 'images/paris.jpg',
  description: 'Un séjour romantique.',
  itinerary: ['Jour un'],
  accommodationId: '1',
};

const sampleStay: Accommodation = {
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

interface Catalog {
  tours: Observable<Tour[]>;
  accommodations?: Observable<Accommodation[]>;
  continents?: Observable<Continent[]>;
  profile?: UserProfile | null;
  favorites?: string[];
}

const customer: UserProfile = { uid: 'u1', email: 'ada@test.com', name: 'Ada', role: 'user' };

function render(catalog: Catalog) {
  const service: Partial<CatalogService> = {
    getTours: () => catalog.tours,
    getAccommodations: () => catalog.accommodations ?? of([]),
    getContinents: () => catalog.continents ?? of([]),
  };
  TestBed.configureTestingModule({
    imports: [CatalogListComponent],
    providers: [
      provideRouter([]),
      { provide: CatalogService, useValue: service },
      { provide: AuthService, useValue: { profile: signal(catalog.profile ?? null) } },
      {
        provide: FavoritesService,
        useValue: {
          ids: signal<ReadonlySet<string>>(new Set(catalog.favorites ?? [])),
          status: signal('ready'),
          toggle: vi.fn(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(CatalogListComponent);
  fixture.detectChanges();
  return fixture;
}

function text(root: unknown): string {
  return ((root as { nativeElement: HTMLElement }).nativeElement.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('CatalogListComponent', () => {
  describe('favoris', () => {
    const kenya: Tour = { ...sampleTour, id: '3', title: 'Safari au Kenya', country: 'Kenya' };

    async function ready(catalog: Partial<Catalog>, path = '') {
      const fixture = render({
        tours: of([sampleTour, kenya]),
        accommodations: of([sampleStay]),
        ...catalog,
      });
      if (path) {
        await TestBed.inject(Router).navigateByUrl(path);
      }
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }

    function cards(fixture: ReturnType<typeof render>): number {
      return (fixture.nativeElement as HTMLElement).querySelectorAll('app-destination-card').length;
    }

    it('propose la case « Mes favoris seulement » à un client connecté uniquement', async () => {
      const visitor = await ready({ profile: null });
      expect((visitor.nativeElement as HTMLElement).querySelector('#f-favorites')).toBeNull();
      TestBed.resetTestingModule();

      const admin = await ready({ profile: { ...customer, role: 'admin' } });
      expect((admin.nativeElement as HTMLElement).querySelector('#f-favorites')).toBeNull();
      TestBed.resetTestingModule();

      const client = await ready({ profile: customer });
      const box = (client.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#f-favorites');
      expect(box?.type).toBe('checkbox');
      expect(text(client)).toContain('Mes favoris seulement');
    });

    it("filtre sur les favoris et reflète le paramètre d'URL favoris=1", async () => {
      const fixture = await ready({ profile: customer, favorites: ['3'] });
      expect(cards(fixture)).toBe(2);
      const box = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#f-favorites')!;
      box.checked = true;
      box.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toContain('favoris=1');
      expect(cards(fixture)).toBe(1);
      expect(text(fixture)).toContain('Safari au Kenya');
    });

    it('affiche un état vide dédié quand le client n’a aucun favori', async () => {
      const fixture = await ready({ profile: customer, favorites: [] }, '/?favoris=1');
      expect(cards(fixture)).toBe(0);
      expect(text(fixture)).toContain('Vous n’avez pas encore de favori');
    });

    it('ignore favoris=1 pour un visiteur', async () => {
      const fixture = await ready({ profile: null }, '/?favoris=1');
      expect(cards(fixture)).toBe(2);
    });

    it('place un bouton cœur sur chaque carte', async () => {
      const fixture = await ready({ profile: customer, favorites: ['3'] });
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'app-favorite-button button',
      );
      expect(buttons.length).toBe(2);
      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('recherche', () => {
    const kenya: Tour = {
      ...sampleTour,
      id: '3',
      title: 'Safari au Kenya',
      country: 'Kenya',
      continent: 'Afrique',
    };

    afterEach(() => vi.useRealTimers());

    async function ready(path = '') {
      const fixture = render({ tours: of([sampleTour, kenya]), accommodations: of([sampleStay]) });
      if (path) {
        await TestBed.inject(Router).navigateByUrl(path);
      }
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }

    function field(fixture: ReturnType<typeof render>): HTMLInputElement {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#f-query')!;
    }

    function type(fixture: ReturnType<typeof render>, value: string): void {
      const input = field(fixture);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }

    function cards(fixture: ReturnType<typeof render>): number {
      return (fixture.nativeElement as HTMLElement).querySelectorAll('app-destination-card').length;
    }

    it('associe un label visible au champ de recherche', async () => {
      const fixture = await ready();
      const root = fixture.nativeElement as HTMLElement;
      expect(field(fixture).type).toBe('search');
      expect(root.querySelector('label[for="f-query"]')?.textContent).toContain(
        'Rechercher un circuit ou un pays',
      );
    });

    it("filtre après l'anti-rebond de 250 ms et met l'URL à jour", async () => {
      const fixture = await ready();
      vi.useFakeTimers();
      type(fixture, 'KENYA');
      vi.advanceTimersByTime(249);
      expect(TestBed.inject(Router).url).not.toContain('q=');
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toContain('q=KENYA');
      expect(cards(fixture)).toBe(1);
      expect(text(fixture)).toContain('Safari au Kenya');
      expect(text(fixture)).toContain('1 circuit');
    });

    it('affiche un état vide adapté puis efface la recherche', async () => {
      const fixture = await ready();
      vi.useFakeTimers();
      type(fixture, 'zzz');
      vi.advanceTimersByTime(250);
      vi.useRealTimers();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(text(fixture)).toContain('Aucun résultat pour « zzz »');

      const clear = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[aria-label="Effacer la recherche"]',
      )!;
      clear.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).not.toContain('q=');
      expect(cards(fixture)).toBe(2);
      expect(field(fixture).value).toBe('');
    });

    it('remplit le champ depuis ?q= et « Réinitialiser » efface la recherche', async () => {
      const fixture = await ready('/?q=safari');
      const root = fixture.nativeElement as HTMLElement;
      expect(field(fixture).value).toBe('safari');
      expect(cards(fixture)).toBe(1);

      const reset = Array.from(root.querySelectorAll('button')).find(
        (b) => (b.textContent ?? '').trim() === 'Réinitialiser',
      )!;
      reset.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(field(fixture).value).toBe('');
      expect(cards(fixture)).toBe(2);
    });
  });

  it('affiche les circuits et le compteur de résultats', async () => {
    const fixture = render({ tours: of([sampleTour]), accommodations: of([sampleStay]) });
    await fixture.whenStable();
    fixture.detectChanges();

    const content = text(fixture);
    expect(content).toContain('Romance à Paris');
    expect(content).toContain('1 circuit');
    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it("affiche l'état vide quand le catalogue ne contient aucun circuit", async () => {
    const fixture = render({ tours: of([]) });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Aucun circuit disponible pour le moment');
  });

  it("affiche l'état d'erreur avec un bouton pour réessayer", async () => {
    const fixture = render({ tours: throwError(() => new Error('boom')) });
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(text(fixture)).toContain('Impossible de charger les circuits');
    expect(text(fixture)).toContain('Réessayer');
  });

  it('affiche les circuits par lots de 9 avec « Voir plus »', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...sampleTour,
      id: String(i + 1),
      title: `Circuit ${i + 1}`,
      accommodationId: '1',
    }));
    const fixture = render({ tours: of(many), accommodations: of([sampleStay]) });
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const cards = (): number => root.querySelectorAll('app-destination-card').length;
    const more = (): HTMLButtonElement | undefined =>
      Array.from(root.querySelectorAll('button')).find((b) =>
        (b.textContent ?? '').includes('Voir plus'),
      );

    expect(cards()).toBe(9);
    expect(text(fixture)).toContain('20 circuits');
    expect(text(fixture)).toContain('11 restants');

    more()?.click();
    fixture.detectChanges();
    expect(cards()).toBe(18);

    more()?.click();
    fixture.detectChanges();
    expect(cards()).toBe(20);
    expect(more()).toBeUndefined();
  });

  it('affiche des squelettes pendant le chargement', () => {
    const fixture = render({ tours: new Observable<Tour[]>(() => undefined) });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(text(fixture)).toContain('Chargement des circuits');
  });
});
