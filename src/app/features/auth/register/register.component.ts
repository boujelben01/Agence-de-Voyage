import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-errors';
import { safeReturnUrl } from '../../../core/utils/safe-return-url';
import { ToastService } from '../../../shared/toast/toast.service';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

export const PASSWORD_MIN_LENGTH = 8;

/** Validateur de groupe : la confirmation doit être identique au mot de passe. */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirmation = group.get('confirmPassword')?.value as string | undefined;
  return password === confirmation ? null : { passwordsMismatch: true };
}

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  barClass: string;
}

const STRENGTH_LEVELS = {
  1: { label: 'Faible', barClass: 'bg-red-600' },
  2: { label: 'Moyen', barClass: 'bg-sand-700' },
  3: { label: 'Bon', barClass: 'bg-ocean-600' },
  4: { label: 'Excellent', barClass: 'bg-emerald-600' },
} as const;

/** Indicateur de force (affichage uniquement) : longueur, casse, chiffres, symboles. */
function passwordStrength(value: string): PasswordStrength {
  if (value.length === 0) {
    return { score: 0, label: '', barClass: 'bg-ocean-100' };
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return { score: 1, ...STRENGTH_LEVELS[1] };
  }
  const points =
    1 +
    (value.length >= 12 ? 1 : 0) +
    (/[a-z]/.test(value) && /[A-Z]/.test(value) ? 1 : 0) +
    (/\d/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
  const score = Math.max(1, Math.min(4, points - 1)) as 1 | 2 | 3 | 4;
  return { score, ...STRENGTH_LEVELS[score] };
}

type FieldName = 'name' | 'email' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      image="images/hero-kyoto.jpg"
      heading="Créez votre compte"
      intro="Quelques secondes suffisent pour préparer votre prochain voyage."
      caption="Le prochain horizon commence ici."
      subcaption="Rejoignez l’agence et composez des voyages à votre image."
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <div>
          <label for="register-name" class="field-label">Nom complet</label>
          <div class="relative">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700" aria-hidden="true">
              <circle cx="12" cy="8.5" r="3.7" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M4.5 20c.8-3.6 3.7-5.5 7.5-5.5s6.7 1.9 7.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            <input
              id="register-name"
              type="text"
              formControlName="name"
              autocomplete="name"
              class="field-input field-input-icon"
              [attr.aria-invalid]="invalid('name')"
              [attr.aria-describedby]="invalid('name') ? 'register-name-error' : null"
            />
          </div>
          <p id="register-name-error" class="field-error" aria-live="polite">
            @if (invalid('name')) {
              Le nom est obligatoire.
            }
          </p>
        </div>

        <div>
          <label for="register-email" class="field-label">Adresse e-mail</label>
          <div class="relative">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M4 7.5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <input
              id="register-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="field-input field-input-icon"
              [attr.aria-invalid]="invalid('email')"
              [attr.aria-describedby]="invalid('email') ? 'register-email-error' : null"
            />
          </div>
          <p id="register-email-error" class="field-error" aria-live="polite">
            @if (invalid('email')) {
              {{
                form.controls.email.hasError('required')
                  ? 'L’adresse e-mail est obligatoire.'
                  : 'Saisissez une adresse e-mail valide.'
              }}
            }
          </p>
        </div>

        <div>
          <label for="register-password" class="field-label">Mot de passe</label>
          <div class="relative">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="9.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            <input
              id="register-password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
              class="field-input field-input-icon pr-12"
              [attr.aria-invalid]="invalid('password')"
              [attr.aria-describedby]="
                invalid('password') ? 'register-password-error' : 'register-password-hint'
              "
            />
            <button
              type="button"
              class="field-toggle"
              [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7" />
                @if (showPassword()) {
                  <path d="M4 4l16 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                }
              </svg>
            </button>
          </div>

          <!-- Indicateur de force : affichage uniquement, ne conditionne pas la validation. -->
          <div class="mt-2 flex items-center gap-3" aria-hidden="true">
            <div class="grid flex-1 grid-cols-4 gap-1.5">
              @for (step of strengthSteps; track step) {
                <span
                  class="h-1.5 rounded-full transition-colors"
                  [class]="step <= strength().score ? strength().barClass : 'bg-ocean-100'"
                ></span>
              }
            </div>
            <span class="w-20 text-right text-xs font-medium text-ocean-900">{{
              strength().label
            }}</span>
          </div>
          <p id="register-password-hint" class="field-hint">
            {{ minLength }} caractères minimum. Mélangez majuscules, chiffres et symboles pour plus
            de sécurité.
          </p>
          <p id="register-password-error" class="field-error" aria-live="polite">
            @if (invalid('password')) {
              {{
                form.controls.password.hasError('required')
                  ? 'Le mot de passe est obligatoire.'
                  : 'Le mot de passe doit contenir au moins ' + minLength + ' caractères.'
              }}
            }
          </p>
        </div>

        <div>
          <label for="register-confirm" class="field-label">Confirmation du mot de passe</label>
          <div class="relative">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="9.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            <input
              id="register-confirm"
              [type]="showConfirm() ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
              class="field-input field-input-icon pr-12"
              [attr.aria-invalid]="confirmInvalid()"
              [attr.aria-describedby]="confirmInvalid() ? 'register-confirm-error' : null"
            />
            <button
              type="button"
              class="field-toggle"
              [attr.aria-label]="showConfirm() ? 'Masquer la confirmation' : 'Afficher la confirmation'"
              [attr.aria-pressed]="showConfirm()"
              (click)="showConfirm.set(!showConfirm())"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7" />
                @if (showConfirm()) {
                  <path d="M4 4l16 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                }
              </svg>
            </button>
          </div>
          <p id="register-confirm-error" class="field-error" aria-live="polite">
            @if (confirmInvalid()) {
              {{
                form.controls.confirmPassword.hasError('required')
                  ? 'Veuillez confirmer le mot de passe.'
                  : 'Les mots de passe ne sont pas identiques.'
              }}
            }
          </p>
        </div>

        <button type="submit" [disabled]="submitting()" class="btn-primary w-full">
          @if (submitting()) {
            <span
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            ></span>
            Création du compte…
          } @else {
            Créer mon compte
          }
        </button>

        <div aria-live="polite" class="min-h-6">
          @if (error(); as message) {
            <p class="alert alert-error" role="alert">
              <svg viewBox="0 0 20 20" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M10 6v5M10 13.8v.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              <span>{{ message }}</span>
            </p>
          }
        </div>
      </form>

      <p class="mt-6 text-center text-sm text-ocean-800">
        Déjà inscrit ?
        <a
          routerLink="/connexion"
          [queryParams]="returnUrlParams"
          class="rounded font-semibold text-ocean-700 underline underline-offset-4 hover:text-ocean-900"
          >Se connecter</a
        >
      </p>
    </app-auth-shell>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly returnUrl = safeReturnUrl(
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'),
  );

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly returnUrlParams = this.returnUrl ? { returnUrl: this.returnUrl } : {};
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);
  protected readonly strengthSteps = [1, 2, 3, 4] as const;
  protected readonly error = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.pattern(/\S/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  protected readonly strength = computed(() => passwordStrength(this.passwordValue()));

  protected invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected confirmInvalid(): boolean {
    const control = this.form.controls.confirmPassword;
    return (
      (control.touched || control.dirty) &&
      (control.invalid || this.form.hasError('passwordsMismatch'))
    );
  }

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.auth.register(name, email, password);
      this.toast.show('Votre compte a bien été créé. Bienvenue !');
      await this.router.navigateByUrl(this.returnUrl ?? '/');
    } catch (error) {
      this.error.set(firebaseErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
