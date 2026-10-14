import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { waitForProfile } from '../utils/wait-for-profile';

/** Accès réservé aux utilisateurs connectés ; sinon /connexion?returnUrl=… */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return waitForProfile(inject(AuthService)).pipe(
    map((profile) =>
      profile
        ? true
        : router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
