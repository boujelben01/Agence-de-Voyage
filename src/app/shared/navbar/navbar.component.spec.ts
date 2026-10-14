import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from './navbar.component';

const client: UserProfile = { uid: 'u1', email: 'u@test.com', name: 'Ada Lovelace', role: 'user' };
const admin: UserProfile = { uid: 'a1', email: 'a@test.com', name: 'Admin Agence', role: 'admin' };

async function render(profile: UserProfile | null) {
  TestBed.configureTestingModule({
    imports: [NavbarComponent],
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { profile: signal<UserProfile | null>(profile), logout: async () => undefined },
      },
    ],
  });
  const fixture = TestBed.createComponent(NavbarComponent);
  await settle(fixture);
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function click(root: HTMLElement, selector: string): void {
  root.querySelector<HTMLElement>(selector)?.click();
}

function menuItems(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('#user-menu [role="menuitem"]')).map((el) =>
    (el.textContent ?? '').trim(),
  );
}

function mobileItems(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('#mobile-menu li')).map((el) =>
    (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
  );
}

describe('NavbarComponent — menu utilisateur', () => {
  it('propose « Mon profil » et « Déconnexion » à un client', async () => {
    const { fixture, root } = await render(client);
    click(root, 'button[aria-haspopup="menu"]');
    await settle(fixture);

    expect(menuItems(root)).toEqual(['Mon profil', 'Déconnexion']);
    expect(root.textContent).not.toContain('Mes réservations');
  });

  it('propose « Administration » et « Déconnexion » à un administrateur, sans profil', async () => {
    const { fixture, root } = await render(admin);
    click(root, 'button[aria-haspopup="menu"]');
    await settle(fixture);

    expect(menuItems(root)).toEqual(['Administration', 'Déconnexion']);
  });

  it('applique la même logique dans le menu mobile', async () => {
    const asClient = await render(client);
    click(asClient.root, 'button[aria-controls="mobile-menu"]');
    await settle(asClient.fixture);
    expect(mobileItems(asClient.root)).toEqual(['Accueil', 'Destinations', 'Mon profil', 'Déconnexion']);
    TestBed.resetTestingModule();

    const asAdmin = await render(admin);
    click(asAdmin.root, 'button[aria-controls="mobile-menu"]');
    await settle(asAdmin.fixture);
    expect(mobileItems(asAdmin.root)).toEqual([
      'Accueil',
      'Destinations',
      'Administration',
      'Déconnexion',
    ]);
  });

  it('propose Connexion et Inscription à un visiteur', async () => {
    const { root } = await render(null);
    const links = Array.from(root.querySelectorAll('header nav a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('/connexion');
    expect(links).toContain('/inscription');
    expect(root.querySelector('button[aria-haspopup="menu"]')).toBeNull();
  });
});
