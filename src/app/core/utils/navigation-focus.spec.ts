import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { provideNavigationFocus } from './navigation-focus';

@Component({
  template: '<main id="contenu" tabindex="-1">Page</main>',
})
class PageComponent {}

@Component({
  imports: [RouterOutlet],
  template: '<button id="avant">Avant</button><router-outlet />',
})
class HostComponent {}

describe('provideNavigationFocus', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([
          { path: 'a', component: PageComponent },
          { path: 'b', component: PageComponent },
        ]),
        provideNavigationFocus(),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    const router = TestBed.inject(Router);
    return { fixture, router };
  }

  const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));

  it('déplace le focus sur #contenu quand la page change', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/a');
    fixture.detectChanges();
    await flush();
    // Premier chargement : pas de vol de focus.
    expect(document.activeElement?.id).not.toBe('contenu');

    await router.navigateByUrl('/b');
    fixture.detectChanges();
    await flush();
    expect(document.activeElement?.id).toBe('contenu');
  });

  it('ne touche pas au focus quand seuls les query params changent', async () => {
    const { fixture, router } = setup();
    await router.navigateByUrl('/a');
    fixture.detectChanges();
    await flush();

    const before = document.getElementById('avant');
    before?.focus();
    await router.navigateByUrl('/a?tri=prix');
    fixture.detectChanges();
    await flush();
    expect(document.activeElement).toBe(before);
  });
});
