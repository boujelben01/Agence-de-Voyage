import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { map } from 'rxjs';
import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Tour } from '../../core/models/tour.model';
import { TourInput } from '../../core/services/admin.service';
import {
  MAX_TOUR_DURATION,
  countryChoices,
  imageOptions,
  itineraryError,
  parseItinerary,
} from './admin-forms';

type FieldName =
  | 'title'
  | 'continent'
  | 'country'
  | 'price'
  | 'duration'
  | 'image'
  | 'description'
  | 'accommodationId'
  | 'itinerary';

const positivePrice: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? null
    : { price: 'Le prix doit être supérieur à 0.' };
};

const durationRange: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  const ok =
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_TOUR_DURATION;
  return ok ? null : { duration: `La durée doit être un nombre entier de jours entre 1 et ${MAX_TOUR_DURATION}.` };
};

/** Erreur « itinéraire » posée sur le contrôle lui-même quand le nombre de lignes ≠ durée. */
const itineraryMatchesDuration: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const itinerary = group.get('itinerary');
  const duration = group.get('duration')?.value;
  if (!itinerary) {
    return null;
  }
  const message = itineraryError(
    String(itinerary.value ?? ''),
    typeof duration === 'number' ? duration : null,
  );
  return message ? { itinerary: message } : null;
};

/** Formulaire de création / modification d'un circuit (réactif et typé). */
@Component({
  selector: 'app-tour-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-6 space-y-6">
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Informations générales</legend>
        <div class="grid gap-5 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="tour-title" class="field-label">Titre</label>
          <input id="tour-title" type="text" formControlName="title" class="field-input"
            [attr.aria-invalid]="invalid('title')" [attr.aria-describedby]="invalid('title') ? 'tour-title-error' : null" />
          <p id="tour-title-error" class="field-error" aria-live="polite">{{ errorOf('title') }}</p>
        </div>

        <div>
          <label for="tour-continent" class="field-label">Continent</label>
          <select id="tour-continent" formControlName="continent" class="field-input"
            [attr.aria-invalid]="invalid('continent')" [attr.aria-describedby]="invalid('continent') ? 'tour-continent-error' : null">
            <option value="">Choisir…</option>
            @for (c of continents(); track c.id) {
              <option [value]="c.name">{{ c.name }}</option>
            }
          </select>
          <p id="tour-continent-error" class="field-error" aria-live="polite">{{ errorOf('continent') }}</p>
        </div>

        <div>
          <label for="tour-country" class="field-label">Pays</label>
          <select id="tour-country" formControlName="country" class="field-input"
            [attr.aria-invalid]="invalid('country')" [attr.aria-describedby]="invalid('country') ? 'tour-country-error' : null">
            <option value="">Choisir…</option>
            @for (country of countries(); track country) {
              <option [value]="country">{{ country }}</option>
            }
          </select>
          <p id="tour-country-error" class="field-error" aria-live="polite">{{ errorOf('country') }}</p>
        </div>
        </div>
      </fieldset>
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Tarif et durée</legend>
        <div class="grid gap-5 sm:grid-cols-2">

        <div>
          <label for="tour-price" class="field-label">Prix par personne (€)</label>
          <input id="tour-price" type="number" inputmode="decimal" min="1" step="1" formControlName="price" class="field-input"
            [attr.aria-invalid]="invalid('price')" [attr.aria-describedby]="invalid('price') ? 'tour-price-error' : null" />
          <p id="tour-price-error" class="field-error" aria-live="polite">{{ errorOf('price') }}</p>
        </div>

        <div>
          <label for="tour-duration" class="field-label">Durée (jours)</label>
          <input id="tour-duration" type="number" inputmode="numeric" min="1" [attr.max]="maxDuration" step="1" formControlName="duration" class="field-input"
            [attr.aria-invalid]="invalid('duration')" [attr.aria-describedby]="invalid('duration') ? 'tour-duration-error' : null" />
          <p id="tour-duration-error" class="field-error" aria-live="polite">{{ errorOf('duration') }}</p>
        </div>
        </div>
      </fieldset>
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Hébergement et visuel</legend>
        <div class="grid gap-5 sm:grid-cols-2">

        <div class="sm:col-span-2">
          <label for="tour-accommodation" class="field-label">Hébergement</label>
          <select id="tour-accommodation" formControlName="accommodationId" class="field-input"
            [attr.aria-invalid]="invalid('accommodationId')" [attr.aria-describedby]="invalid('accommodationId') ? 'tour-accommodation-error' : 'tour-accommodation-hint'">
            <option value="">Choisir…</option>
            @for (a of accommodationChoices(); track a.id) {
              <option [value]="a.id">{{ a.name }} — {{ a.city }}</option>
            }
          </select>
          <p id="tour-accommodation-hint" class="field-hint">
            Seuls les hébergements du pays choisi sont proposés.
          </p>
          <p id="tour-accommodation-error" class="field-error" aria-live="polite">{{ errorOf('accommodationId') }}</p>
        </div>

        <div class="sm:col-span-2">
          <label for="tour-image" class="field-label">Image</label>
          <div class="flex items-start gap-4">
            <select id="tour-image" formControlName="image" class="field-input"
              [attr.aria-invalid]="invalid('image')" [attr.aria-describedby]="invalid('image') ? 'tour-image-error' : null">
              <option value="">Choisir…</option>
              @for (option of images(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
            @if (form.controls.image.value; as src) {
              <img [src]="src" alt="Aperçu de l’image choisie" width="160" height="96" class="h-14 w-24 shrink-0 rounded-field object-cover ring-1 ring-ocean-100" />
            }
          </div>
          <p id="tour-image-error" class="field-error" aria-live="polite">{{ errorOf('image') }}</p>
        </div>
        </div>
      </fieldset>
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Contenu</legend>
        <div class="grid gap-5 sm:grid-cols-2">

        <div class="sm:col-span-2">
          <label for="tour-description" class="field-label">Description</label>
          <textarea id="tour-description" rows="3" formControlName="description" class="field-input"
            [attr.aria-invalid]="invalid('description')" [attr.aria-describedby]="invalid('description') ? 'tour-description-error' : null"></textarea>
          <p id="tour-description-error" class="field-error" aria-live="polite">{{ errorOf('description') }}</p>
        </div>

        <div class="sm:col-span-2">
          <label for="tour-itinerary" class="field-label">Itinéraire (un jour par ligne)</label>
          <textarea id="tour-itinerary" rows="6" formControlName="itinerary" class="field-input"
            [attr.aria-invalid]="invalid('itinerary')" aria-describedby="tour-itinerary-count tour-itinerary-error"></textarea>
          <p id="tour-itinerary-count" class="field-hint" aria-live="polite">
            {{ stepCount() }} {{ stepCount() > 1 ? 'jours renseignés' : 'jour renseigné' }}
            @if (expectedDays(); as days) {
              sur {{ days }} attendu{{ days > 1 ? 's' : '' }}
            }
          </p>
          <p id="tour-itinerary-error" class="field-error" aria-live="polite">{{ errorOf('itinerary') }}</p>
        </div>
        </div>
      </fieldset>

      @if (submitError(); as message) {
        <p class="alert alert-error" role="alert">{{ message }}</p>
      }

      <div class="flex flex-wrap justify-end gap-3 pt-2">
        <button type="button" class="btn-outline" (click)="cancelled.emit()" [disabled]="submitting()">Annuler</button>
        <button type="submit" class="btn-primary" [disabled]="submitting()">
          {{ submitting() ? 'Enregistrement…' : tour() ? 'Enregistrer les modifications' : 'Créer le circuit' }}
        </button>
      </div>
    </form>
  `,
})
export class TourFormComponent implements OnInit {
  readonly tour = input<Tour | null>(null);
  readonly continents = input.required<readonly Continent[]>();
  readonly accommodations = input.required<readonly Accommodation[]>();
  readonly submitting = input(false);
  readonly submitError = input<string | null>(null);

  readonly saved = output<TourInput>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly maxDuration = MAX_TOUR_DURATION;

  protected readonly form = this.fb.group(
    {
      title: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
      continent: this.fb.control('', [Validators.required]),
      country: this.fb.control('', [Validators.required]),
      price: this.fb.control<number | null>(null, [positivePrice]),
      duration: this.fb.control<number | null>(null, [durationRange]),
      image: this.fb.control('', [Validators.required]),
      description: this.fb.control('', [Validators.required, Validators.maxLength(1000)]),
      accommodationId: this.fb.control('', [Validators.required]),
      itinerary: this.fb.control('', [Validators.required]),
    },
    { validators: [itineraryMatchesDuration] },
  );

  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly countries = computed(() =>
    countryChoices(this.continents(), this.values().continent),
  );
  protected readonly accommodationChoices = computed(() => {
    const country = this.values().country;
    return this.accommodations().filter((a) => a.country === country);
  });
  protected readonly images = computed(() => imageOptions(this.values().image));
  protected readonly stepCount = computed(() => parseItinerary(this.values().itinerary).length);
  protected readonly expectedDays = computed(() => {
    const d = this.values().duration;
    return typeof d === 'number' && Number.isInteger(d) && d > 0 ? d : null;
  });

  constructor() {
    // Un pays ou un hébergement qui ne correspond plus à la sélection est retiré.
    this.form.controls.continent.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((continent) => {
        const country = this.form.controls.country.value;
        if (country && !countryChoices(this.continents(), continent).includes(country)) {
          this.form.controls.country.setValue('');
        }
      });
    this.form.controls.country.valueChanges.pipe(takeUntilDestroyed()).subscribe((country) => {
      const id = this.form.controls.accommodationId.value;
      const match = this.accommodations().find((a) => a.id === id);
      if (id && match?.country !== country) {
        this.form.controls.accommodationId.setValue('');
      }
    });
  }

  ngOnInit(): void {
    const tour = this.tour();
    if (tour) {
      this.form.setValue({
        title: tour.title,
        continent: tour.continent,
        country: tour.country,
        price: tour.price,
        duration: tour.duration,
        image: tour.image,
        description: tour.description,
        accommodationId: tour.accommodationId,
        itinerary: tour.itinerary.join('\n'),
      });
    }
  }

  protected invalid(name: FieldName): boolean {
    return this.errorOf(name) !== '';
  }

  protected errorOf(name: FieldName): string {
    const control = this.form.controls[name];
    if (!(control.touched || control.dirty)) {
      return '';
    }
    const own = control.errors;
    if (own) {
      const custom: unknown = own[name];
      if (typeof custom === 'string') {
        return custom;
      }
      return REQUIRED_MESSAGES[name] ?? 'Valeur invalide.';
    }
    if (name === 'itinerary') {
      const groupError: unknown = this.form.errors?.['itinerary'];
      return typeof groupError === 'string' ? groupError : '';
    }
    return '';
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.price === null || v.duration === null) {
      return;
    }
    this.saved.emit({
      title: v.title.trim(),
      country: v.country,
      continent: v.continent,
      price: v.price,
      duration: v.duration,
      image: v.image,
      description: v.description.trim(),
      itinerary: parseItinerary(v.itinerary),
      accommodationId: v.accommodationId,
    });
  }
}

const REQUIRED_MESSAGES: Partial<Record<FieldName, string>> = {
  title: 'Indiquez un titre (120 caractères maximum).',
  continent: 'Choisissez un continent.',
  country: 'Choisissez un pays.',
  image: 'Choisissez une image.',
  description: 'Indiquez une description (1000 caractères maximum).',
  accommodationId: 'Choisissez un hébergement.',
  itinerary: 'Renseignez l’itinéraire, un jour par ligne.',
};
