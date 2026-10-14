import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService, validateName } from '../../core/services/profile.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ReservationsListComponent } from '../booking/reservations-list.component';
import { FavoritesListComponent } from './favorites-list.component';
import { ProfileTab, paramForTab, tabFromParam } from './profile-tabs';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

const nameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const message = validateName(String(control.value ?? ''));
  return message === null ? null : { name: message };
};

interface TabDefinition {
  id: ProfileTab;
  label: string;
}

/**
 * Espace client : informations personnelles, réservations et favoris. L'onglet actif est reflété
 * dans l'URL (?onglet=reservations|favoris) pour pouvoir y renvoyer ; l'accès est limité aux clients.
 */
@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    ReservationsListComponent,
    FavoritesListComponent,
    PageHeaderComponent,
    BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="contenu" tabindex="-1" class="focus:outline-none">
      <app-page-header
        [narrow]="true"
        [tabs]="true"
        eyebrow="Mon espace"
        title="Mon profil"
        description="Gérez vos informations personnelles, suivez vos réservations et retrouvez vos circuits favoris."
      >
        <div
          slot="below"
          role="tablist"
          aria-label="Sections du profil"
          class="tab-list mt-8"
          (keydown)="onTabKeydown($event)"
        >
          @for (tab of tabs; track tab.id) {
            <button
              #tabButton
              type="button"
              role="tab"
              class="tab"
              [id]="'tab-' + tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              [attr.aria-controls]="'panel-' + tab.id"
              [attr.tabindex]="activeTab() === tab.id ? 0 : -1"
              (click)="select(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </app-page-header>

      <div class="container-narrow section-tight">
        <div
          role="tabpanel"
          id="panel-informations"
          aria-labelledby="tab-informations"
          [hidden]="activeTab() !== 'informations'"
        >
          @if (activeTab() === 'informations') {
            @if (auth.profile(); as profile) {
              <section class="card max-w-3xl p-6 sm:p-8" aria-labelledby="profile-title">
                <div class="flex items-center gap-4">
                  <span
                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-lg font-semibold text-white"
                    aria-hidden="true"
                    >{{ initials(profile.name) }}</span
                  >
                  <div class="min-w-0">
                    <h2 id="profile-title" class="text-h3 text-ocean-950">Mes informations</h2>
                    <p class="truncate text-sm text-ocean-800">{{ profile.name }}</p>
                  </div>
                </div>

                <dl class="mt-8 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt class="text-sm font-medium text-ocean-800">Adresse e-mail</dt>
                    <dd class="mt-1 break-all font-medium text-ocean-950" id="profile-email">{{ profile.email }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-ocean-800">Statut</dt>
                    <dd class="mt-1">
                      <app-badge tone="neutral"><span id="profile-role">Client</span></app-badge>
                    </dd>
                  </div>
                </dl>

                <form
                  [formGroup]="form"
                  (ngSubmit)="submit()"
                  novalidate
                  class="mt-8 border-t border-ocean-100 pt-8"
                >
                  <h3 class="text-base font-semibold text-ocean-950">Modifier mon nom</h3>
                  <div class="mt-4 max-w-md">
                    <label for="profile-name" class="field-label">Nom</label>
                    <input
                      id="profile-name"
                      type="text"
                      formControlName="name"
                      autocomplete="name"
                      class="field-input"
                      [attr.aria-invalid]="invalid()"
                      [attr.aria-describedby]="invalid() ? 'profile-name-error' : 'profile-name-hint'"
                    />
                    <p id="profile-name-hint" class="field-hint">Entre 1 et 100 caractères.</p>
                    <p id="profile-name-error" class="field-error" aria-live="polite">{{ errorMessage() }}</p>
                  </div>

                  @if (submitError(); as message) {
                    <p class="alert alert-error mt-2" role="alert">{{ message }}</p>
                  }

                  <button type="submit" class="btn-primary mt-6" [disabled]="submitting()">
                    {{ submitting() ? 'Enregistrement…' : 'Enregistrer' }}
                  </button>
                </form>
              </section>
            } @else {
              <p class="text-ocean-800" role="status">Chargement du profil…</p>
            }
          }
        </div>

        <div
          role="tabpanel"
          id="panel-reservations"
          aria-labelledby="tab-reservations"
          [hidden]="activeTab() !== 'reservations'"
        >
          @if (activeTab() === 'reservations') {
            <app-reservations-list />
          }
        </div>

        <div
          role="tabpanel"
          id="panel-favoris"
          aria-labelledby="tab-favoris"
          [hidden]="activeTab() !== 'favoris'"
        >
          @if (activeTab() === 'favoris') {
            <app-favorites-list />
          }
        </div>
      </div>
    </main>
  `,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly tabs: readonly TabDefinition[] = [
    { id: 'informations', label: 'Mes informations' },
    { id: 'reservations', label: 'Mes réservations' },
    { id: 'favoris', label: 'Favoris' },
  ];
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  private readonly onglet = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('onglet'))),
    { initialValue: this.route.snapshot.queryParamMap.get('onglet') },
  );
  protected readonly activeTab = computed<ProfileTab>(() => tabFromParam(this.onglet()));

  protected readonly form = this.fb.group({
    name: this.fb.control('', [nameValidator]),
  });

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  constructor() {
    // Pré-remplit le nom dès que le profil est connu, sans écraser une saisie en cours.
    effect(() => {
      const profile = this.auth.profile();
      if (profile) {
        untracked(() => {
          if (this.form.pristine) {
            this.form.setValue({ name: profile.name });
          }
        });
      }
    });
  }

  /** Change d'onglet en mettant à jour l'URL (sans ajouter d'entrée d'historique). */
  protected select(tab: ProfileTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet: paramForTab(tab) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Navigation clavier du motif « tabs » : flèches, Début, Fin. */
  protected onTabKeydown(event: KeyboardEvent): void {
    const count = this.tabs.length;
    const current = this.tabs.findIndex((t) => t.id === this.activeTab());
    let next = current;
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % count;
        break;
      case 'ArrowLeft':
        next = (current - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(this.tabs[next].id);
    this.tabButtons()[next]?.nativeElement.focus();
  }

  protected initials(name: string): string {
    const letters = name
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase());
    return letters.join('') || '?';
  }

  protected invalid(): boolean {
    const control = this.form.controls.name;
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorMessage(): string {
    if (!this.invalid()) {
      return '';
    }
    const error: unknown = this.form.controls.name.errors?.['name'];
    return typeof error === 'string' ? error : '';
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.profiles
      .updateName(this.form.controls.name.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.form.markAsPristine();
          this.toast.show('Votre profil a été mis à jour.');
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'La mise à jour a échoué. Veuillez réessayer.';
          this.submitting.set(false);
          this.submitError.set(message);
          this.toast.show(message, 'error');
        },
      });
  }
}
