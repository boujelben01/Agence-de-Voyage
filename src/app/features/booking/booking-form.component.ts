import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Tour } from '../../core/models/tour.model';
import { CatalogService } from '../../core/services/catalog.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ToastService } from '../../shared/toast/toast.service';
import { formatDate, formatDuration, formatPrice } from '../catalog/catalog-filters';
import {
  MAX_TRAVELERS,
  MIN_TRAVELERS,
  computeEndDate,
  computeTotal,
  formatTravelers,
  tomorrowIso,
  validateStartDate,
  validateTravelers,
} from './booking-utils';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { StepsComponent } from '../../shared/steps/steps.component';

type TourState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; tour: Tour };

const startDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const message = validateStartDate(String(control.value ?? ''));
  return message === null ? null : { startDate: message };
};

const travelersValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  const message = validateTravelers(typeof value === 'number' ? value : null);
  return message === null ? null : { travelers: message };
};

/** Réservation d'un circuit : choix de la date et du nombre de voyageurs, total en direct. */
@Component({
  selector: 'app-booking-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    EmptyStateComponent,
    SkeletonComponent,
    StepsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="contenu" tabindex="-1" class="focus:outline-none">
      @switch (state().status) {
        @case ('loading') {
          <div class="container-narrow py-14" role="status" aria-live="polite">
            <h1 class="sr-only">Chargement du circuit…</h1>
            <div class="grid gap-8 lg:grid-cols-[1fr_24rem]" aria-hidden="true">
              <app-skeleton class="h-96 rounded-card" />
              <app-skeleton class="h-96 rounded-card" />
            </div>
          </div>
        }
        @case ('error') {
          <div class="container-narrow section-tight">
            <app-empty-state
              tone="error"
              icon="alert"
              [alert]="true"
              [level]="1"
              title="Impossible de charger ce circuit"
              description="Une erreur est survenue pendant la lecture du catalogue. Vérifiez votre connexion puis réessayez."
            >
              <a routerLink="/destinations" class="btn-primary">Toutes les destinations</a>
            </app-empty-state>
          </div>
        }
        @case ('not-found') {
          <div class="container-narrow section-tight text-center">
            <p class="eyebrow">Erreur 404</p>
            <h1 class="mt-3 text-h1 text-ocean-950">Ce circuit n’existe pas</h1>
            <p class="mx-auto mt-3 max-w-xl text-lead text-ocean-800">
              Le circuit que vous souhaitez réserver est introuvable ou n’est plus proposé.
            </p>
            <a routerLink="/destinations" class="btn-primary mt-8">Voir les destinations</a>
          </div>
        }
        @case ('ready') {
          @if (tour(); as current) {
            <div class="container-narrow py-8 sm:py-12">
              <a [routerLink]="['/destinations', current.id]" class="btn-outline btn-sm">
                <span aria-hidden="true">←</span> Retour au circuit
              </a>
              <app-steps class="mt-6" [current]="2" />
              <h1 class="mt-6 text-balance text-h1 text-ocean-950">
                Réserver : {{ current.title }}
              </h1>

              <div class="mt-10 grid gap-8 lg:grid-cols-[1fr_24rem]">
                <form
                  [formGroup]="form"
                  (ngSubmit)="submit()"
                  novalidate
                  class="card space-y-6 p-6 sm:p-8"
                  aria-label="Formulaire de réservation"
                >
                  <div>
                    <label for="booking-start" class="field-label">Date de départ</label>
                    <input
                      id="booking-start"
                      type="date"
                      formControlName="startDate"
                      class="field-input"
                      [min]="minDate"
                      [attr.aria-invalid]="invalid('startDate')"
                      [attr.aria-describedby]="invalid('startDate') ? 'booking-start-error' : 'booking-start-hint'"
                    />
                    <p id="booking-start-hint" class="field-hint">Départ possible à partir de demain.</p>
                    <p id="booking-start-error" class="field-error" aria-live="polite">
                      {{ invalid('startDate') ? errorOf('startDate') : '' }}
                    </p>
                  </div>

                  <div>
                    <label for="booking-travelers" class="field-label">Nombre de voyageurs</label>
                    <input
                      id="booking-travelers"
                      type="number"
                      inputmode="numeric"
                      formControlName="travelers"
                      class="field-input"
                      [attr.min]="minTravelers"
                      [attr.max]="maxTravelers"
                      step="1"
                      [attr.aria-invalid]="invalid('travelers')"
                      [attr.aria-describedby]="invalid('travelers') ? 'booking-travelers-error' : 'booking-travelers-hint'"
                    />
                    <p id="booking-travelers-hint" class="field-hint">
                      De {{ minTravelers }} à {{ maxTravelers }} voyageurs.
                    </p>
                    <p id="booking-travelers-error" class="field-error" aria-live="polite">
                      {{ invalid('travelers') ? errorOf('travelers') : '' }}
                    </p>
                  </div>

                  @if (submitError(); as message) {
                    <p class="alert alert-error" role="alert">{{ message }}</p>
                  }

                  <button type="submit" class="btn-primary w-full" [disabled]="submitting()">
                    {{ submitting() ? 'Confirmation en cours…' : 'Confirmer la réservation' }}
                  </button>
                  <p class="text-center text-sm text-ocean-800">
                    Aucun paiement n’est demandé : projet de démonstration.
                  </p>
                </form>

                <aside aria-label="Récapitulatif" class="lg:sticky lg:top-24 lg:self-start">
                  <div class="card overflow-hidden shadow-lift">
                    <img
                      [src]="current.image"
                      alt=""
                      width="800"
                      height="500"
                      class="aspect-[16/10] w-full object-cover"
                    />
                    <div class="p-6">
                      <p class="eyebrow">{{ current.country }}</p>
                      <h2 class="mt-2 text-h3 text-ocean-950">{{ current.title }}</h2>
                      <dl class="mt-5 space-y-3 border-t border-ocean-100 pt-5 text-sm">
                        <div class="flex justify-between gap-4">
                          <dt class="text-ocean-800">Durée</dt>
                          <dd class="font-semibold text-ocean-950">{{ duration(current.duration) }}</dd>
                        </div>
                        <div class="flex justify-between gap-4">
                          <dt class="text-ocean-800">Prix par personne</dt>
                          <dd class="font-semibold text-ocean-950">{{ price(current.price) }}</dd>
                        </div>
                        @if (endDate(); as end) {
                          <div class="flex justify-between gap-4">
                            <dt class="text-ocean-800">Retour</dt>
                            <dd class="font-semibold text-ocean-950">{{ date(end) }}</dd>
                          </div>
                        }
                        @if (travelerCount(); as count) {
                          <div class="flex justify-between gap-4">
                            <dt class="text-ocean-800">Voyageurs</dt>
                            <dd class="font-semibold text-ocean-950">{{ travelersLabel(count) }}</dd>
                          </div>
                        }
                      </dl>
                      <div
                        class="mt-5 flex items-baseline justify-between gap-4 rounded-field bg-ocean-50 px-4 py-3"
                        aria-live="polite"
                      >
                        <span class="font-medium text-ocean-900">Total</span>
                        <span id="booking-total" class="text-3xl font-semibold tracking-tight text-ocean-950">
                          {{ total() === null ? '—' : price(total() ?? 0) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          }
        }
      }
    </main>
  `,
})
export class BookingFormComponent {
  private readonly catalog = inject(CatalogService);
  private readonly reservations = inject(ReservationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly minDate = tomorrowIso();
  protected readonly minTravelers = MIN_TRAVELERS;
  protected readonly maxTravelers = MAX_TRAVELERS;
  protected readonly duration = formatDuration;
  protected readonly price = formatPrice;
  protected readonly date = formatDate;
  protected readonly travelersLabel = formatTravelers;

  protected readonly form = this.fb.group({
    startDate: this.fb.control('', [startDateValidator]),
    travelers: this.fb.control<number | null>(2, [travelersValidator]),
  });

  protected readonly state = signal<TourState>({ status: 'loading' });
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly tour = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.tour : null;
  });

  /** Nombre de voyageurs valide, sinon null. */
  protected readonly travelerCount = computed(() => {
    const value = this.values().travelers;
    return validateTravelers(value) === null ? value : null;
  });

  protected readonly endDate = computed(() => {
    const tour = this.tour();
    const start = this.values().startDate;
    if (!tour || validateStartDate(start) !== null) {
      return null;
    }
    return computeEndDate(start, tour.duration);
  });

  protected readonly total = computed(() => {
    const tour = this.tour();
    const count = this.travelerCount();
    return tour && count !== null ? computeTotal(tour.price, count) : null;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('tourId') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          this.state.set({ status: 'loading' });
          if (id === '') {
            return of<TourState>({ status: 'not-found' });
          }
          return this.catalog.getTour(id).pipe(
            map((tour): TourState => (tour ? { status: 'ready', tour } : { status: 'not-found' })),
            catchError(() => of<TourState>({ status: 'error' })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  protected invalid(name: 'startDate' | 'travelers'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorOf(name: 'startDate' | 'travelers'): string {
    const errors = this.form.controls[name].errors;
    const message: unknown = errors?.[name];
    return typeof message === 'string' ? message : '';
  }

  protected submit(): void {
    const tour = this.tour();
    if (!tour || this.submitting()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { startDate, travelers } = this.form.getRawValue();
    if (travelers === null) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    // Le total n'est jamais transmis : le service le recalcule à partir du prix du circuit.
    this.reservations
      .create(tour, startDate, travelers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (id) => {
          this.toast.show('Votre réservation est confirmée.');
          void this.router.navigate(['/confirmation', id]);
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'La réservation a échoué. Veuillez réessayer.';
          this.submitting.set(false);
          this.submitError.set(message);
          this.toast.show(message, 'error');
        },
      });
  }
}
