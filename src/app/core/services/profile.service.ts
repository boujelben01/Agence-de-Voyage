import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, catchError, defer, from, throwError } from 'rxjs';

export const NAME_MAX_LENGTH = 100;

/** Erreur de mise à jour du profil, avec un message directement affichable. */
export class ProfileError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

/** Message d'erreur si le nom (après trim) n'a pas entre 1 et 100 caractères, sinon null. */
export function validateName(value: string): string | null {
  const name = value.trim();
  if (name.length === 0) {
    return 'Indiquez votre nom.';
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Le nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères.`;
  }
  return null;
}

/**
 * Mise à jour du profil de l'utilisateur connecté. Seul le champ `name` est écrit : le rôle et
 * l'e-mail ne sont jamais envoyés (et les règles Firestore les protègent). Le signal `profile` de
 * AuthService se met à jour tout seul via son docData.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  /** Écriture Firestore isolée : doc() est appelé dans le contexte d'injection de updateName. */
  protected async writeName(uid: string, name: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), { name });
  }

  updateName(value: string): Observable<void> {
    return defer(() =>
      from(
        runInInjectionContext(this.injector, async () => {
          const message = validateName(value);
          if (message) {
            throw new ProfileError(message);
          }
          const user = this.auth.currentUser;
          if (!user) {
            throw new ProfileError('Vous devez être connecté pour modifier votre profil.');
          }
          await this.writeName(user.uid, value.trim());
        }),
      ),
    ).pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof ProfileError
            ? error
            : new ProfileError(messageFor(error), error),
        ),
      ),
    );
  }
}

function messageFor(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code: unknown = (error as { code: unknown }).code;
    if (code === 'permission-denied') {
      return "Cette modification n'est pas autorisée pour votre compte.";
    }
    if (code === 'unavailable') {
      return 'Connexion indisponible. Vérifiez votre réseau puis réessayez.';
    }
  }
  return 'Impossible de mettre à jour votre profil. Veuillez réessayer.';
}
