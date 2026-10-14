import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Tour } from '../../core/models/tour.model';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { HomeComponent } from './home.component';

const tour: Tour = {
  id: '2',
  title: 'Romance à Paris',
  country: 'France',
  continent: 'Europe',
  price: 980,
  duration: 5,
  image: 'images/paris.jpg',
  description: '',
  itinerary: [],
  accommodationId: '1',
};

type ProfileState = UserProfile | null | undefined;

// Sans second argument : visiteur déconnecté (null). `undefined` explicite : état en chargement.
function render(tours$: Observable<Tour[]>, ...rest: [ProfileState?]) {
  const profile: ProfileState = rest.length > 0 ? rest[0] : null;
  const service: Partial<CatalogService> = { getTours: () => tours$ };
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideRouter([]),
      { provide: CatalogService, useValue: service },
      { provide: AuthService, useValue: { profile: signal<ProfileState>(profile) } },
      {
        provide: FavoritesService,
        useValue: { ids: signal<ReadonlySet<string>>(new Set()), toggle: vi.fn() },
      },
    ],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  return fixture;
}

function links(fixture: { nativeElement: unknown }): string[] {
  const root = fixture.nativeElement as HTMLElement;
  return Array.from(root.querySelectorAll('app-destination-card a')).map(
    (a) => a.getAttribute('href') ?? '',
  );
}

describe('HomeComponent — destinations populaires', () => {
  it('affiche un cœur favori sur chaque circuit du catalogue', async () => {
    const fixture = render(of([tour]), { uid: 'u1', email: 'a@test.com', name: 'Ada', role: 'user' });
    await fixture.whenStable();
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('app-favorite-button button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('affiche les circuits du catalogue avec un lien vers le détail', async () => {
    const fixture = render(of([tour]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(links(fixture)).toEqual(['/destinations/2']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Romance à Paris');
  });

  it('retombe sur la vitrine statique quand le catalogue est vide', async () => {
    const fixture = render(of([]));
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-destination-card')).toHaveLength(4);
    expect(links(fixture)).toEqual([]);
  });

  it('retombe sur la vitrine statique en cas d’erreur', async () => {
    const fixture = render(throwError(() => new Error('boom')));
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-destination-card')).toHaveLength(4);
  });
});

describe('HomeComponent — boutons du hero', () => {
  const heroLinks = (fixture: { nativeElement: unknown }): Map<string, string> => {
    const root = fixture.nativeElement as HTMLElement;
    const hero = root.querySelector('section[aria-labelledby="hero-title"]');
    const entries = Array.from(hero?.querySelectorAll('a') ?? []).map(
      (a) => [(a.textContent ?? '').trim(), a.getAttribute('href') ?? ''] as const,
    );
    return new Map(entries);
  };

  it('ne contient plus de formulaire de recherche', () => {
    const fixture = render(of([]));
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('propose les destinations et la création de compte à un visiteur', () => {
    const links = heroLinks(render(of([]), null));
    expect(links.get('Découvrir les destinations')).toBe('/destinations');
    expect(links.get('Créer mon compte')).toBe('/inscription');
  });

  it('masque « Créer mon compte » pour un utilisateur connecté', () => {
    const user: UserProfile = { uid: 'u1', email: 'u@test.com', name: 'Ada', role: 'user' };
    const links = heroLinks(render(of([]), user));
    expect(links.get('Découvrir les destinations')).toBe('/destinations');
    expect(links.has('Créer mon compte')).toBe(false);
  });

  it('masque « Créer mon compte » tant que l’état de connexion se charge', () => {
    const links = heroLinks(render(of([]), undefined));
    expect(links.has('Créer mon compte')).toBe(false);
  });
});
