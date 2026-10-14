import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  provideEnvironmentInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const MAIN_ID = 'contenu';

/** Chemin sans query params ni fragment : les filtres du catalogue ne doivent pas déplacer le focus. */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}

/** Déplace le focus sur la zone de contenu (#contenu) ; réessaie une fois si elle n'est pas encore rendue. */
export function focusMain(doc: Document, retry = true): void {
  const main = doc.getElementById(MAIN_ID);
  if (main) {
    main.focus({ preventScroll: true });
  } else if (retry) {
    setTimeout(() => focusMain(doc, false), 100);
  }
}

/**
 * À chaque changement de page (pas au chargement initial, pas pour un simple changement de query
 * params ou de fragment), le focus passe à #contenu pour que lecteurs d'écran et clavier
 * repartent du début de la nouvelle page.
 */
export function provideNavigationFocus(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const router = inject(Router);
    const doc = inject(DOCUMENT);
    let previous: string | null = null;

    router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((event) => {
        const path = pathOf(event.urlAfterRedirects);
        const changed = previous !== null && previous !== path;
        previous = path;
        if (changed) {
          setTimeout(() => focusMain(doc));
        }
      });
  });
}
