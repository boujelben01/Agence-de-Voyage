import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { waitForProfile } from '../utils/wait-for-profile';

/** Non connecté -> /connexion ; connecté mais pas admin -> /. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return waitForProfile(inject(AuthService)).pipe(
    map((profile) => {
      if (!profile) {
        return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
      }
      return profile.role === 'admin' ? true : router.createUrlTree(['/']);
    }),
  );
};
