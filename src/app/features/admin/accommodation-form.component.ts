import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { AccommodationInput } from '../../core/services/admin.service';
import {
  ACCOMMODATION_TYPES,
  ACCOMMODATION_TYPE_LABELS,
  availabilityError,
  imageOptions,
} from './admin-forms';

type FieldName =
  | 'name'
  | 'country'
  | 'city'
  | 'type'
  | 'pricePerNight'
  | 'stars'
  | 'image'
  | 'availableFrom'
  | 'availableTo';

const positivePrice: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? null
    : { pricePerNight: 'Le prix par nuit doit être supérieur à 0.' };
};

const starsRange: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  const ok = typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
  return ok ? null : { stars: 'Le nombre d’étoiles doit être un entier entre 1 et 5.' };
};

const endAfterStart: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const message = availabilityError(
    String(group.get('availableFrom')?.value ?? ''),
    String(group.get('availableTo')?.value ?? ''),
  );
  return message ? { availableTo: message } : null;
};

const REQUIRED_MESSAGES: Partial<Record<FieldName, string>> = {
  name: 'Indiquez le nom (100 caractères maximum).',
  country: 'Choisissez un pays.',
  city: 'Indiquez la ville.',
  type: 'Choisissez un type d’hébergement.',
  image: 'Choisissez une image.',
  availableFrom: 'Indiquez la date de début de disponibilité.',
  availableTo: 'Indiquez la date de fin de disponibilité.',
};

/** Formulaire de création / modification d'un hébergement (réactif et typé). */
@Component({
  selector: 'app-accommodation-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-6 space-y-6">
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Identité et lieu</legend>
        <div class="grid gap-5 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="acc-name" class="field-label">Nom</label>
          <input id="acc-name" type="text" formControlName="name" class="field-input"
            [attr.aria-invalid]="invalid('name')" [attr.aria-describedby]="invalid('name') ? 'acc-name-error' : null" />
          <p id="acc-name-error" class="field-error" aria-live="polite">{{ errorOf('name') }}</p>
        </div>

        <div>
          <label for="acc-country" class="field-label">Pays</label>
          <select id="acc-country" formControlName="country" class="field-input"
            [attr.aria-invalid]="invalid('country')" [attr.aria-describedby]="invalid('country') ? 'acc-country-error' : null">
            <option value="">Choisir…</option>
            @for (country of countries(); track country) {
              <option [value]="country">{{ country }}</option>
            }
          </select>
          <p id="acc-country-error" class="field-error" aria-live="polite">{{ errorOf('country') }}</p>
        </div>

        <div>
          <label for="acc-city" class="field-label">Ville</label>
          <input id="acc-city" type="text" formControlName="city" class="field-input"
            [attr.aria-invalid]="invalid('city')" [attr.aria-describedby]="invalid('city') ? 'acc-city-error' : null" />
          <p id="acc-city-error" class="field-error" aria-live="polite">{{ errorOf('city') }}</p>
        </div>

        <div>
          <label for="acc-type" class="field-label">Type</label>
          <select id="acc-type" formControlName="type" class="field-input"
            [attr.aria-invalid]="invalid('type')" [attr.aria-describedby]="invalid('type') ? 'acc-type-error' : null">
            <option value="">Choisir…</option>
            @for (type of types; track type) {
              <option [value]="type">{{ typeLabels[type] }}</option>
            }
          </select>
          <p id="acc-type-error" class="field-error" aria-live="polite">{{ errorOf('type') }}</p>
        </div>
        </div>
      </fieldset>
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Catégorie et tarif</legend>
        <div class="grid gap-5 sm:grid-cols-2">

        <div>
          <label for="acc-stars" class="field-label">Étoiles (1 à 5)</label>
          <input id="acc-stars" type="number" inputmode="numeric" min="1" max="5" step="1" formControlName="stars" class="field-input"
            [attr.aria-invalid]="invalid('stars')" [attr.aria-describedby]="invalid('stars') ? 'acc-stars-error' : null" />
          <p id="acc-stars-error" class="field-error" aria-live="polite">{{ errorOf('stars') }}</p>
        </div>

        <div>
          <label for="acc-price" class="field-label">Prix par nuit (€)</label>
          <input id="acc-price" type="number" inputmode="decimal" min="1" step="1" formControlName="pricePerNight" class="field-input"
            [attr.aria-invalid]="invalid('pricePerNight')" [attr.aria-describedby]="invalid('pricePerNight') ? 'acc-price-error' : null" />
          <p id="acc-price-error" class="field-error" aria-live="polite">{{ errorOf('pricePerNight') }}</p>
        </div>
        </div>
      </fieldset>
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Visuel</legend>
        <div class="grid gap-5 sm:grid-cols-2">

        <div class="sm:col-span-2">
          <label for="acc-image" class="field-label">Image</label>
          <div class="flex items-start gap-4">
            <select id="acc-image" formControlName="image" class="field-input"
              [attr.aria-invalid]="invalid('image')" [attr.aria-describedby]="invalid('image') ? 'acc-image-error' : null">
              <option value="">Choisir…</option>
              @for (option of images(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
            @if (form.controls.image.value; as src) {
              <img [src]="src" alt="Aperçu de l’image choisie" width="160" height="96" class="h-14 w-24 shrink-0 rounded-field object-cover ring-1 ring-ocean-100" />
            }
          </div>
          <p id="acc-image-error" class="field-error" aria-live="polite">{{ errorOf('image') }}</p>
        </div>
        </div>
      </fieldset>
      <fieldset class="form-section">
        <legend class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-ocean-800">Disponibilité</legend>
        <div class="grid gap-5 sm:grid-cols-2">

        <div>
          <label for="acc-from" class="field-label">Disponible à partir du</label>
          <input id="acc-from" type="date" formControlName="availableFrom" class="field-input"
            [attr.aria-invalid]="invalid('availableFrom')" [attr.aria-describedby]="invalid('availableFrom') ? 'acc-from-error' : null" />
          <p id="acc-from-error" class="field-error" aria-live="polite">{{ errorOf('availableFrom') }}</p>
        </div>

        <div>
          <label for="acc-to" class="field-label">Disponible jusqu’au</label>
          <input id="acc-to" type="date" formControlName="availableTo" class="field-input"
            [attr.aria-invalid]="invalid('availableTo')" [attr.aria-describedby]="invalid('availableTo') ? 'acc-to-error' : null" />
          <p id="acc-to-error" class="field-error" aria-live="polite">{{ errorOf('availableTo') }}</p>
        </div>
        </div>
      </fieldset>

      @if (submitError(); as message) {
        <p class="alert alert-error" role="alert">{{ message }}</p>
      }

      <div class="flex flex-wrap justify-end gap-3 pt-2">
        <button type="button" class="btn-outline" (click)="cancelled.emit()" [disabled]="submitting()">Annuler</button>
        <button type="submit" class="btn-primary" [disabled]="submitting()">
          {{ submitting() ? 'Enregistrement…' : accommodation() ? 'Enregistrer les modifications' : 'Créer l’hébergement' }}
        </button>
      </div>
    </form>
  `,
})
export class AccommodationFormComponent implements OnInit {
  readonly accommodation = input<Accommodation | null>(null);
  /** Pays proposés (ceux des continents du catalogue). */
  readonly countryList = input.required<readonly string[]>();
  readonly submitting = input(false);
  readonly submitError = input<string | null>(null);

  readonly saved = output<AccommodationInput>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly types = ACCOMMODATION_TYPES;
  protected readonly typeLabels = ACCOMMODATION_TYPE_LABELS;

  protected readonly form = this.fb.group(
    {
      name: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
      country: this.fb.control('', [Validators.required]),
      city: this.fb.control('', [Validators.required, Validators.maxLength(80)]),
      type: this.fb.control('', [Validators.required]),
      pricePerNight: this.fb.control<number | null>(null, [positivePrice]),
      stars: this.fb.control<number | null>(null, [starsRange]),
      image: this.fb.control('', [Validators.required]),
      availableFrom: this.fb.control('', [Validators.required]),
      availableTo: this.fb.control('', [Validators.required]),
    },
    { validators: [endAfterStart] },
  );

  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly images = computed(() => imageOptions(this.values().image));
  /** Pays courant ajouté à la liste s'il n'y figure pas (données importées). */
  protected readonly countries = computed(() => {
    const current = this.values().country;
    const list = this.countryList();
    return current !== '' && !list.includes(current) ? [current, ...list] : [...list];
  });

  ngOnInit(): void {
    const a = this.accommodation();
    if (a) {
      this.form.setValue({
        name: a.name,
        country: a.country,
        city: a.city,
        type: a.type,
        pricePerNight: a.pricePerNight,
        stars: a.stars,
        image: a.image,
        availableFrom: a.availableFrom,
        availableTo: a.availableTo,
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
      return typeof custom === 'string' ? custom : (REQUIRED_MESSAGES[name] ?? 'Valeur invalide.');
    }
    if (name === 'availableTo') {
      const groupError: unknown = this.form.errors?.['availableTo'];
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
    if (v.pricePerNight === null || v.stars === null) {
      return;
    }
    this.saved.emit({
      name: v.name.trim(),
      country: v.country,
      city: v.city.trim(),
      type: v.type,
      pricePerNight: v.pricePerNight,
      stars: v.stars,
      image: v.image,
      availableFrom: v.availableFrom,
      availableTo: v.availableTo,
    });
  }
}
