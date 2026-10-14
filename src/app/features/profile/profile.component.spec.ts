import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Tour } from '../../core/models/tour.model';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ProfileError, ProfileService, validateName } from '../../core/services/profile.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ProfileComponent } from './profile.component';

const favoriteTour: Tour = {
  id: 't1',
  title: 'Safari au Kenya',
  country: 'Kenya',
  continent: 'Afrique',
  price: 1500,
  duration: 6,
  image: 'images/kenya.jpg',
  description: '',
  itinerary: [],
  accommodationId: '',
};

const user: UserProfile = { uid: 'u1', email: 'ada@test.com', name: 'Ada Lovelace', role: 'user' };

async function setup(
  options: {
    updateName?: (name: string) => Observable<void>;
    url?: string;
    favorites?: string[];
  } = {},
) {
  const spy = vi.fn(options.updateName ?? (() => of(undefined)));
  const listMine = vi.fn(() => of([]));
  TestBed.configureTestingModule({
    imports: [ProfileComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { profile: signal<UserProfile | null>(user) } },
      { provide: ProfileService, useValue: { updateName: spy } },
      { provide: ReservationService, useValue: { listMine, cancel: vi.fn() } },
      {
        provide: CatalogService,
        useValue: { getTours: () => of([favoriteTour]), getAccommodations: () => of([]) },
      },
      {
        provide: FavoritesService,
        useValue: {
          ids: signal<ReadonlySet<string>>(new Set(options.favorites ?? [])),
          status: signal('ready'),
          toggle: vi.fn(),
          retry: vi.fn(),
        },
      },
    ],
  });
  const router = TestBed.inject(Router);
  if (options.url) {
    await router.navigateByUrl(options.url);
  }
  const fixture = TestBed.createComponent(ProfileComponent);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, spy, listMine, router, toast: TestBed.inject(ToastService) };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function typeName(fixture: ComponentFixture<unknown>, root: HTMLElement, value: string) {
  const input = root.querySelector<HTMLInputElement>('#profile-name');
  if (!input) {
    throw new Error('champ nom introuvable');
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

async function submit(fixture: ComponentFixture<unknown>, root: HTMLElement) {
  root.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await settle(fixture);
}

function tab(root: HTMLElement, id: string): HTMLButtonElement {
  const el = root.querySelector<HTMLButtonElement>(`#tab-${id}`);
  if (!el) {
    throw new Error(`onglet introuvable : ${id}`);
  }
  return el;
}

describe('validateName', () => {
  it('accepte un nom de 1 à 100 caractères après trim', () => {
    expect(validateName('A')).toBeNull();
    expect(validateName('  Ada  ')).toBeNull();
    expect(validateName('x'.repeat(100))).toBeNull();
  });

  it('refuse un nom vide ou trop long', () => {
    expect(validateName('')).toContain('Indiquez votre nom');
    expect(validateName('   ')).toContain('Indiquez votre nom');
    expect(validateName('x'.repeat(101))).toContain('100 caractères');
  });
});

describe('ProfileComponent — informations', () => {
  it('affiche l’e-mail, le statut « Client » et pré-remplit le nom', async () => {
    const { root } = await setup();
    expect(root.querySelector('#profile-email')?.textContent).toContain('ada@test.com');
    expect(root.querySelector('#profile-role')?.textContent).toContain('Client');
    expect(root.querySelector<HTMLInputElement>('#profile-name')?.value).toBe('Ada Lovelace');
    expect(root.querySelectorAll('h1')).toHaveLength(1);
  });

  it('refuse un nom vide sans appeler le service', async () => {
    const { fixture, root, spy } = await setup();
    await typeName(fixture, root, '   ');
    await submit(fixture, root);

    expect(spy).not.toHaveBeenCalled();
    expect(root.querySelector('#profile-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#profile-name-error')?.textContent).toContain('Indiquez votre nom');
  });

  it('refuse un nom de plus de 100 caractères', async () => {
    const { fixture, root, spy } = await setup();
    await typeName(fixture, root, 'x'.repeat(101));
    await submit(fixture, root);

    expect(spy).not.toHaveBeenCalled();
    expect(root.querySelector('#profile-name-error')?.textContent).toContain('100 caractères');
  });

  it('appelle le service avec le nom saisi puis affiche un toast de succès', async () => {
    const { fixture, root, spy, toast } = await setup();
    await typeName(fixture, root, '  Ada King  ');
    await submit(fixture, root);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].trim()).toBe('Ada King');
    expect(toast.toasts().at(-1)).toMatchObject({ kind: 'success' });
  });

  it('affiche l’erreur du service sans perdre la saisie', async () => {
    const { fixture, root, toast } = await setup({
      updateName: () => throwError(() => new ProfileError('Modification refusée.')),
    });
    await typeName(fixture, root, 'Nouveau nom');
    await submit(fixture, root);

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Modification refusée.');
    expect(root.querySelector<HTMLInputElement>('#profile-name')?.value).toBe('Nouveau nom');
    expect(toast.toasts().at(-1)?.kind).toBe('error');
  });
});

describe('ProfileComponent — onglets', () => {
  it('ouvre « Mes informations » par défaut, sans charger les réservations', async () => {
    const { root, listMine } = await setup();
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tab(root, 'informations').getAttribute('aria-selected')).toBe('true');
    expect(tab(root, 'reservations').getAttribute('aria-selected')).toBe('false');
    expect(tab(root, 'reservations').getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('app-reservations-list')).toBeNull();
    expect(listMine).not.toHaveBeenCalled();
  });

  it('ouvre l’onglet des réservations quand l’URL le demande', async () => {
    const { root, listMine } = await setup({ url: '/?onglet=reservations' });
    expect(tab(root, 'reservations').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('app-reservations-list')).not.toBeNull();
    expect(root.querySelector('#profile-name')).toBeNull();
    expect(listMine).toHaveBeenCalled();
  });

  it('change d’onglet au clic et le reflète dans l’URL', async () => {
    const { fixture, root, router } = await setup();
    tab(root, 'reservations').click();
    await settle(fixture);

    expect(router.url).toContain('onglet=reservations');
    expect(tab(root, 'reservations').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('app-reservations-list')).not.toBeNull();

    tab(root, 'informations').click();
    await settle(fixture);
    expect(router.url).not.toContain('onglet');
    expect(root.querySelector('#profile-name')).not.toBeNull();
  });

  it('se commande au clavier avec les flèches, Début et Fin', async () => {
    const { fixture, root, router } = await setup();
    const list = root.querySelector('[role="tablist"]');

    list?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle(fixture);
    expect(tab(root, 'reservations').getAttribute('aria-selected')).toBe('true');
    expect(router.url).toContain('onglet=reservations');

    list?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await settle(fixture);
    expect(tab(root, 'informations').getAttribute('aria-selected')).toBe('true');

    list?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settle(fixture);
    expect(tab(root, 'favoris').getAttribute('aria-selected')).toBe('true');
    expect(router.url).toContain('onglet=favoris');
  });
});

describe('ProfileComponent — favoris', () => {
  it('ajoute l’onglet « Favoris » à côté des deux autres', async () => {
    const { root } = await setup();
    const labels = Array.from(root.querySelectorAll('[role="tab"]')).map((t) =>
      (t.textContent ?? '').trim(),
    );
    expect(labels).toEqual(['Mes informations', 'Mes réservations', 'Favoris']);
  });

  it('affiche la grille des circuits favoris avec un cœur pour les retirer', async () => {
    const { root } = await setup({ url: '/?onglet=favoris', favorites: ['t1', 'inconnu'] });
    expect(tab(root, 'favoris').getAttribute('aria-selected')).toBe('true');
    const cards = root.querySelectorAll('app-destination-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Safari au Kenya');
    const heart = cards[0].querySelector('app-favorite-button button');
    expect(heart?.getAttribute('aria-pressed')).toBe('true');
    expect(heart?.getAttribute('aria-label')).toContain('Retirer');
  });

  it('affiche un état vide avec un lien vers les destinations', async () => {
    const { root } = await setup({ url: '/?onglet=favoris', favorites: [] });
    expect(root.textContent).toContain('Vous n’avez pas encore de favori');
    const link = Array.from(root.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').includes('Voir les destinations'),
    );
    expect(link?.getAttribute('href')).toBe('/destinations');
  });
});
