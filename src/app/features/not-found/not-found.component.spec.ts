import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  it('affiche un titre unique, un statut et les deux boutons', () => {
    TestBed.configureTestingModule({ imports: [NotFoundComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('main#contenu')).not.toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Erreur 404');
    const links = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/', '/destinations']);
  });

  it('est la route de repli, avec un titre de page', () => {
    const fallback = routes.find((route) => route.path === '**');
    expect(fallback?.title).toBe('Page introuvable');
    expect(fallback?.redirectTo).toBeUndefined();
    expect(fallback?.loadComponent).toBeDefined();
  });
});
