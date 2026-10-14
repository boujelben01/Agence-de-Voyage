import { Injector, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, filter, map, take } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/** Émet une seule fois, dès que l'état d'authentification est connu (profile !== undefined). */
export function waitForProfile(
  auth: AuthService,
  injector: Injector = inject(Injector),
): Observable<UserProfile | null> {
  return toObservable(auth.profile, { injector }).pipe(
    filter((profile) => profile !== undefined),
    map((profile) => profile ?? null),
    take(1),
  );
}
