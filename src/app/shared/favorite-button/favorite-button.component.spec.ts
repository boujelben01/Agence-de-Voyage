import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ToastService } from '../toast/toast.service';
import { FavoriteButtonComponent } from './favorite-button.component';

@Component({ template: '' })
class DummyComponent {}

const customer: UserProfile = { uid: 'u1', email: 'ada@test.com', name: 'Ada', role: 'user' };

async function setup(profile: UserProfile | null | undefined, favorites: string[] = []) {
  const toggle = vi.fn(async () => true);
  TestBed.configureTestingModule({
    imports: [FavoriteButtonComponent],
    providers: [
      provideRouter([
        { path: 'destinations', component: DummyComponent },
        { path: 'connexion', component: DummyComponent },
      ]),
      { provide: AuthService, useValue: { profile: signal(profile) } },
      {
        provide: FavoritesService,
        useValue: { ids: signal<ReadonlySet<string>>(new Set(favorites)), toggle },
      },
    ],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/destinations?q=paris');
  const fixture = TestBed.createComponent(FavoriteButtonComponent);
  fixture.componentRef.setInput('tourId', 't1');
  fixture.componentRef.setInput('title', 'Safari au Kenya');
  fixture.detectChanges();
  const button = (): HTMLButtonElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector('button');
  return { fixture, button, toggle, router, toast: TestBed.inject(ToastService) };
}

describe('FavoriteButtonComponent', () => {
  it('expose aria-pressed et un nom accessible « Ajouter … aux favoris »', async () => {
    const { button } = await setup(customer);
    expect(button()?.getAttribute('aria-pressed')).toBe('false');
    expect(button()?.getAttribute('aria-label')).toBe('Ajouter « Safari au Kenya » aux favoris');
  });

  it('indique l’état favori avec « Retirer … des favoris »', async () => {
    const { button } = await setup(customer, ['t1']);
    expect(button()?.getAttribute('aria-pressed')).toBe('true');
    expect(button()?.getAttribute('aria-label')).toBe('Retirer « Safari au Kenya » des favoris');
  });

  it('bascule le favori au clic pour un client', async () => {
    const { button, toggle } = await setup(customer);
    button()?.click();
    expect(toggle).toHaveBeenCalledWith('t1');
  });

  it('redirige un visiteur vers la connexion avec returnUrl et un toast', async () => {
    const { button, toggle, router, toast } = await setup(null);
    button()?.click();
    await new Promise((resolve) => setTimeout(resolve));

    expect(toggle).not.toHaveBeenCalled();
    expect(router.url).toContain('/connexion');
    expect(router.url).toContain('returnUrl=%2Fdestinations%3Fq%3Dparis');
    expect(toast.toasts().some((t) => t.kind === 'info')).toBe(true);
  });

  it('est masqué pour un administrateur', async () => {
    const { button } = await setup({ ...customer, role: 'admin' });
    expect(button()).toBeNull();
  });

  it('affiche le libellé « Favoris » en variante étiquetée', async () => {
    const { fixture, button } = await setup(customer);
    fixture.componentRef.setInput('showLabel', true);
    fixture.detectChanges();
    expect(button()?.textContent).toContain('Favoris');
  });
});
