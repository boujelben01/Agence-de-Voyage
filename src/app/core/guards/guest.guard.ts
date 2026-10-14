import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { waitForProfile } from '../utils/wait-for-profile';

/** Pages réservées aux visiteurs (connexion, inscription) : un utilisateur connecté va sur /. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return waitForProfile(inject(AuthService)).pipe(
    map((profile) => (profile ? router.createUrlTree(['/']) : true)),
  );
};
