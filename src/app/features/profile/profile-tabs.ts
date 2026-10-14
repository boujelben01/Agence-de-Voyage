import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';

export type ProfileTab = 'informations' | 'reservations' | 'favoris';

/** Valeur du paramètre d'URL `onglet` pour l'onglet des réservations. */
export const RESERVATIONS_TAB_PARAM = 'reservations';

/** Valeur du paramètre d'URL `onglet` pour l'onglet des favoris. */
export const FAVORITES_TAB_PARAM = 'favoris';

/** Onglet demandé par l'URL (?onglet=reservations|favoris) ; « informations » par défaut. */
export function tabFromParam(value: string | null): ProfileTab {
  switch (value) {
    case RESERVATIONS_TAB_PARAM:
      return 'reservations';
    case FAVORITES_TAB_PARAM:
      return 'favoris';
    default:
      return 'informations';
  }
}

/** Valeur du paramètre `onglet` pour un onglet ; null pour l'onglet par défaut. */
export function paramForTab(tab: ProfileTab): string | null {
  switch (tab) {
    case 'reservations':
      return RESERVATIONS_TAB_PARAM;
    case 'favoris':
      return FAVORITES_TAB_PARAM;
    default:
      return null;
  }
}

/** Redirection des anciens liens /mes-reservations vers l'onglet « Mes réservations ». */
export function redirectToReservationsTab(): UrlTree {
  return inject(Router).createUrlTree(['/profil'], {
    queryParams: { onglet: RESERVATIONS_TAB_PARAM },
  });
}
