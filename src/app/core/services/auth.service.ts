import { Injectable, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { Role, UserProfile } from '../models/user.model';

interface UserDocument {
  name: string;
  email: string;
  role: Role;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /**
   * undefined = chargement, null = déconnecté (ou compte sans profil), UserProfile = connecté.
   * Le rôle vient uniquement du document users/{uid}.
   */
  readonly profile: Signal<UserProfile | null | undefined> = toSignal(
    authState(this.auth).pipe(
      switchMap((user): Observable<UserProfile | null> => {
        if (!user) {
          return of(null);
        }
        return docData(doc(this.firestore, 'users', user.uid)).pipe(
          map((data) => (data ? toProfile(user.uid, data as UserDocument) : null)),
          catchError(() => of(null)),
        );
      }),
    ),
    { initialValue: undefined },
  );

  readonly isLoggedIn = computed(() => !!this.profile());
  readonly isAdmin = computed(() => this.profile()?.role === 'admin');

  async register(name: string, email: string, password: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    // L'e-mail du profil doit être identique à celui du jeton (exigé par les règles Firestore).
    const document: UserDocument = {
      name: name.trim(),
      email: credential.user.email ?? email.trim().toLowerCase(),
      role: 'user',
    };
    try {
      await setDoc(doc(this.firestore, 'users', credential.user.uid), document);
    } catch (error) {
      // Pas de compte Auth sans profil : on le supprime puis on relance l'erreur d'origine.
      await deleteUser(credential.user).catch(() => undefined);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}

function toProfile(uid: string, data: UserDocument): UserProfile {
  return { uid, email: data.email, name: data.name, role: data.role };
}
