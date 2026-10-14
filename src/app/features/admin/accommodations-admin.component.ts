import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, catchError, forkJoin, of } from 'rxjs';
import { Accommodation } from '../../core/models/accommodation.model';
import { Continent } from '../../core/models/continent.model';
import { Tour } from '../../core/models/tour.model';
import { AccommodationInput, AdminService } from '../../core/services/admin.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ModalDialogComponent } from '../../shared/modal-dialog/modal-dialog.component';
import { ToastService } from '../../shared/toast/toast.service';
import { formatPrice } from '../catalog/catalog-filters';
import {
  ACCOMMODATION_SORTS,
  ACCOMMODATION_TYPE_LABELS,
  AccommodationSort,
  AccommodationType,
  accommodationDeletionBlocker,
  countryChoices,
  filterAccommodations,
} from './admin-forms';
import { AccommodationFormComponent } from './accommodation-form.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; accommodations: Accommodation[]; tours: Tour[]; continents: Continent[] };

/** Gestion des hébergements : liste, création, modification et suppression protégée. */
@Component({
  selector: 'app-accommodations-admin',
  imports: [
    AccommodationFormComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [compact]="true"
      eyebrow="Back-office"
      title="Hébergements"
      description="Gérez les hébergements proposés avec les circuits."
    >
      <button type="button" class="btn-primary" (click)="openCreate()" [disabled]="!ready()">
        Ajouter un hébergement
      </button>
    </app-page-header>

    @switch (state().status) {
      @case ('loading') {
        <div class="mt-8 space-y-3" role="status" aria-live="polite">
          <span class="sr-only">Chargement des hébergements…</span>
          @for (n of skeletons; track n) {
            <app-skeleton class="h-16 rounded-card" />
          }
        </div>
      }
      @case ('error') {
        <app-empty-state
          class="mt-8"
          tone="error"
          icon="alert"
          [alert]="true"
          title="Impossible de charger les hébergements"
          [description]="errorMessage()"
        >
          <button type="button" class="btn-primary" (click)="load()">Réessayer</button>
        </app-empty-state>
      }
      @case ('ready') {
        <div class="mt-8 grid gap-4 sm:grid-cols-[1fr_14rem]">
          <div>
            <label for="acc-search" class="field-label">Rechercher</label>
            <input
              id="acc-search"
              type="search"
              class="field-input"
              placeholder="Nom, ville ou pays"
              [value]="search()"
              (input)="onSearch($event)"
            />
          </div>
          <div>
            <label for="acc-sort" class="field-label">Trier par</label>
            <select id="acc-sort" class="field-input" [value]="sort()" (change)="onSort($event)">
              @for (option of sorts; track option.value) {
                <option [value]="option.value" [selected]="option.value === sort()">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        <p class="mt-5 text-sm font-medium text-ocean-800" role="status" aria-live="polite">
          {{ visible().length }} {{ visible().length > 1 ? 'hébergements' : 'hébergement' }}
        </p>

        @if (accommodations().length === 0) {
          <app-empty-state
            class="mt-4"
            icon="bed"
            title="Aucun hébergement dans le catalogue"
            description="Ajoutez un hébergement pour pouvoir le rattacher à un circuit."
          />
        } @else if (visible().length === 0) {
          <app-empty-state
            class="mt-4"
            icon="search"
            title="Aucun hébergement ne correspond à la recherche"
          />
        } @else {
          <div class="table-wrap mt-4">
            <table class="data-table" style="--table-min: 44rem">
              <caption class="sr-only">Liste des hébergements</caption>
              <thead>
                <tr>
                  <th scope="col">Image</th>
                  <th scope="col">Nom</th>
                  <th scope="col">Lieu</th>
                  <th scope="col">Type</th>
                  <th scope="col">Prix / nuit</th>
                  <th scope="col" class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (a of visible(); track a.id) {
                  <tr>
                    <td class="cell-image w-24">
                      <img
                        [src]="a.image"
                        alt=""
                        width="160"
                        height="100"
                        class="aspect-[16/10] w-20 rounded-field object-cover"
                        loading="lazy"
                      />
                    </td>
                    <th scope="row">{{ a.name }}</th>
                    <td data-label="Lieu">{{ a.city }}, {{ a.country }}</td>
                    <td data-label="Type">{{ typeLabel(a.type) }} · {{ a.stars }} ★</td>
                    <td data-label="Prix / nuit" class="font-semibold text-ocean-950">
                      {{ price(a.pricePerNight) }}
                    </td>
                    <td class="cell-actions">
                      <div class="flex justify-end gap-2">
                        <button type="button" class="btn-icon" title="Modifier" (click)="openEdit(a)">
                          <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                            <path d="M3.5 16.5l.7-3.2L13.6 3.9a1.6 1.6 0 012.3 0l.2.2a1.6 1.6 0 010 2.3L6.7 15.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                          </svg>
                          <span class="sr-only">Modifier {{ a.name }}</span>
                        </button>
                        <button
                          type="button"
                          class="btn-icon btn-icon-danger"
                          title="Supprimer"
                          (click)="askDelete(a)"
                        >
                          <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                            <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                          <span class="sr-only">Supprimer {{ a.name }}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }

    <app-modal-dialog
      #formDialog
      size="lg"
      [heading]="editing() ? 'Modifier l’hébergement' : 'Ajouter un hébergement'"
      (closed)="onFormClosed()"
    >
      @if (formOpen()) {
        <app-accommodation-form
          [accommodation]="editing()"
          [countryList]="countries()"
          [submitting]="saving()"
          [submitError]="saveError()"
          (saved)="save($event)"
          (cancelled)="formDialog.close()"
        />
      }
    </app-modal-dialog>

    <app-modal-dialog #deleteDialog heading="Supprimer cet hébergement ?" (closed)="onDeleteClosed()">
      @if (pendingDelete(); as target) {
        @if (blocker(); as message) {
          <p class="alert alert-error mt-3" role="alert">{{ message }}</p>
          <div class="mt-6 flex justify-end">
            <button type="button" class="btn-outline btn-sm" (click)="deleteDialog.close()">Fermer</button>
          </div>
        } @else {
          <p class="mt-3 text-ocean-800">
            L’hébergement « {{ target.name }} » ({{ target.city }}) sera retiré du catalogue.
            Les réservations existantes conservent leur snapshot et ne sont pas modifiées.
          </p>
          <div class="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" class="btn-outline btn-sm" (click)="deleteDialog.close()" [disabled]="deleting()">
              Annuler
            </button>
            <button type="button" class="btn-danger btn-sm" (click)="confirmDelete()" [disabled]="deleting()">
              {{ deleting() ? 'Suppression…' : 'Oui, supprimer' }}
            </button>
          </div>
        }
      }
    </app-modal-dialog>
  `,
})
export class AccommodationsAdminComponent {
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly formDialog = viewChild.required<ModalDialogComponent>('formDialog');
  private readonly deleteDialog = viewChild.required<ModalDialogComponent>('deleteDialog');

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly sorts = ACCOMMODATION_SORTS;
  protected readonly price = formatPrice;

  protected readonly state = signal<ListState>({ status: 'loading' });
  protected readonly search = signal('');
  protected readonly sort = signal<AccommodationSort>('name');

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Accommodation | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly pendingDelete = signal<Accommodation | null>(null);
  protected readonly deleting = signal(false);

  private subscription: Subscription | null = null;

  protected readonly ready = computed(() => this.state().status === 'ready');
  protected readonly accommodations = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.accommodations : [];
  });
  protected readonly countries = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? countryChoices(state.continents, '') : [];
  });
  protected readonly visible = computed(() =>
    filterAccommodations(this.accommodations(), this.search(), this.sort()),
  );

  /** Message de refus si l'hébergement à supprimer est encore utilisé par un circuit. */
  protected readonly blocker = computed(() => {
    const target = this.pendingDelete();
    const state = this.state();
    if (!target || state.status !== 'ready') {
      return null;
    }
    return accommodationDeletionBlocker(state.tours, target.id);
  });

  constructor() {
    this.load();
  }

  protected typeLabel(type: string): string {
    return ACCOMMODATION_TYPE_LABELS[type as AccommodationType] ?? type;
  }

  protected errorMessage(): string {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  }

  protected load(): void {
    this.subscription?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.subscription = forkJoin({
      accommodations: this.catalog.getAccommodations(),
      tours: this.catalog.getTours(),
      continents: this.catalog.getContinents().pipe(catchError(() => of<Continent[]>([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.state.set({ status: 'ready', ...data }),
        error: (error: unknown) =>
          this.state.set({
            status: 'error',
            message: error instanceof Error ? error.message : 'Une erreur est survenue.',
          }),
      });
  }

  protected onSearch(event: Event): void {
    this.search.set(event.target instanceof HTMLInputElement ? event.target.value : '');
  }

  protected onSort(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.sort.set(event.target.value as AccommodationSort);
    }
  }

  // ----- Création / modification -----

  protected openCreate(): void {
    this.editing.set(null);
    this.saveError.set(null);
    this.formOpen.set(true);
    this.formDialog().show();
  }

  protected openEdit(accommodation: Accommodation): void {
    this.editing.set(accommodation);
    this.saveError.set(null);
    this.formOpen.set(true);
    this.formDialog().show();
  }

  protected onFormClosed(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.saveError.set(null);
    this.saving.set(false);
  }

  protected save(input: AccommodationInput): void {
    if (this.saving()) {
      return;
    }
    const current = this.editing();
    this.saving.set(true);
    this.saveError.set(null);

    const request: Observable<string | void> = current
      ? this.admin.updateAccommodation(current.id, input)
      : this.admin.createAccommodation(input);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        const id = current ? current.id : String(result);
        this.applySaved({ id, ...input });
        this.toast.show(current ? 'Hébergement modifié.' : 'Hébergement créé.');
        this.saving.set(false);
        this.formDialog().close();
      },
      error: (error: unknown) => {
        const message =
          error instanceof Error ? error.message : "L'enregistrement a échoué. Veuillez réessayer.";
        this.saving.set(false);
        this.saveError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }

  private applySaved(accommodation: Accommodation): void {
    this.state.update((state) => {
      if (state.status !== 'ready') {
        return state;
      }
      const exists = state.accommodations.some((a) => a.id === accommodation.id);
      return {
        ...state,
        accommodations: exists
          ? state.accommodations.map((a) => (a.id === accommodation.id ? accommodation : a))
          : [...state.accommodations, accommodation],
      };
    });
  }

  // ----- Suppression -----

  protected askDelete(accommodation: Accommodation): void {
    this.pendingDelete.set(accommodation);
    this.deleteDialog().show();
  }

  protected onDeleteClosed(): void {
    this.pendingDelete.set(null);
    this.deleting.set(false);
  }

  protected confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target || this.deleting() || this.blocker()) {
      return;
    }
    this.deleting.set(true);
    this.admin
      .deleteAccommodation(target.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.state.update((state) =>
            state.status === 'ready'
              ? { ...state, accommodations: state.accommodations.filter((a) => a.id !== target.id) }
              : state,
          );
          this.toast.show('Hébergement supprimé.');
          this.deleteDialog().close();
        },
        error: (error: unknown) => {
          this.toast.show(
            error instanceof Error ? error.message : 'La suppression a échoué. Veuillez réessayer.',
            'error',
          );
          this.deleteDialog().close();
        },
      });
  }
}
