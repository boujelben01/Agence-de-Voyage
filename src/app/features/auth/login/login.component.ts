import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { AuthService } from '../../../core/services/auth.service';
import { firebaseErrorMessage } from '../../../core/utils/firebase-errors';
import { safeReturnUrl } from '../../../core/utils/safe-return-url';
import { waitForProfile } from '../../../core/utils/wait-for-profile';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      image="images/rome-colisee.jpg"
      heading="Bon retour parmi nous"
      intro="Connectez-vous pour retrouver vos voyages et vos préférences."
      caption="Le monde vous attend, reprenez là où vous vous étiez arrêté."
      subcaption="Des circuits sélectionnés, des hébergements de confiance."
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
        <div>
          <label for="login-email" class="field-label">Adresse e-mail</label>
          <div class="relative">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M4 7.5l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <input
              id="login-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="field-input field-input-icon"
              [attr.aria-invalid]="invalid('email')"
              [attr.aria-describedby]="invalid('email') ? 'login-email-error' : null"
            />
          </div>
          <p id="login-email-error" class="field-error" aria-live="polite">
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
          <label for="login-password" class="field-label">Mot de passe</label>
          <div class="relative">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-700" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="9.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            <input
              id="login-password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              class="field-input field-input-icon pr-12"
              [attr.aria-invalid]="invalid('password')"
              [attr.aria-describedby]="invalid('password') ? 'login-password-error' : null"
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
          <p id="login-password-error" class="field-error" aria-live="polite">
            @if (invalid('password')) {
              Le mot de passe est obligatoire.
            }
          </p>
        </div>

        <button type="submit" [disabled]="submitting()" class="btn-primary w-full">
          @if (submitting()) {
            <span
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            ></span>
            Connexion en cours…
          } @else {
            Se connecter
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
        Pas encore de compte ?
        <a
          routerLink="/inscription"
          [queryParams]="returnUrlParams"
          class="rounded font-semibold text-ocean-700 underline underline-offset-4 hover:text-ocean-900"
          >Créer un compte</a
        >
      </p>
    </app-auth-shell>
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly returnUrl = safeReturnUrl(
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'),
  );

  protected readonly returnUrlParams = this.returnUrl ? { returnUrl: this.returnUrl } : {};
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected async submit(): Promise<void> {
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
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      const profile = await firstValueFrom(waitForProfile(this.auth, this.injector));
      const fallback = profile?.role === 'admin' ? '/admin' : '/';
      await this.router.navigateByUrl(this.returnUrl ?? fallback);
    } catch (error) {
      this.error.set(firebaseErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
