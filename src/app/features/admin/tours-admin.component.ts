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
import { AdminService, TourInput } from '../../core/services/admin.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ModalDialogComponent } from '../../shared/modal-dialog/modal-dialog.component';
import { ToastService } from '../../shared/toast/toast.service';
import { formatDuration, formatPrice } from '../catalog/catalog-filters';
import { TOUR_SORTS, TourSort, filterTours } from './admin-forms';
import { TourFormComponent } from './tour-form.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      tours: Tour[];
      accommodations: Accommodation[];
      continents: Continent[];
    };

/** Gestion des circuits : liste avec recherche et tri, création, modification, suppression. */
@Component({
  selector: 'app-tours-admin',
  imports: [
    TourFormComponent,
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
      title="Circuits"
      description="Créez, modifiez et supprimez les circuits du catalogue."
    >
      <button type="button" class="btn-primary" (click)="openCreate($event)" [disabled]="!ready()">
        Ajouter un circuit
      </button>
    </app-page-header>

    @switch (state().status) {
      @case ('loading') {
        <div class="mt-8 space-y-3" role="status" aria-live="polite">
          <span class="sr-only">Chargement des circuits…</span>
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
          title="Impossible de charger les circuits"
          [description]="errorMessage()"
        >
          <button type="button" class="btn-primary" (click)="load()">Réessayer</button>
        </app-empty-state>
      }
      @case ('ready') {
        <div class="mt-8 grid gap-4 sm:grid-cols-[1fr_14rem]">
          <div>
            <label for="tour-search" class="field-label">Rechercher</label>
            <input
              id="tour-search"
              type="search"
              class="field-input"
              placeholder="Titre ou pays"
              [value]="search()"
              (input)="onSearch($event)"
            />
          </div>
          <div>
            <label for="tour-sort" class="field-label">Trier par</label>
            <select id="tour-sort" class="field-input" [value]="sort()" (change)="onSort($event)">
              @for (option of sorts; track option.value) {
                <option [value]="option.value" [selected]="option.value === sort()">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        <p class="mt-5 text-sm font-medium text-ocean-800" role="status" aria-live="polite">
          {{ visible().length }} {{ visible().length > 1 ? 'circuits' : 'circuit' }}
        </p>

        @if (tours().length === 0) {
          <app-empty-state
            class="mt-4"
            icon="compass"
            title="Aucun circuit dans le catalogue"
            description="Ajoutez votre premier circuit pour le rendre visible aux voyageurs."
          />
        } @else if (visible().length === 0) {
          <app-empty-state
            class="mt-4"
            icon="search"
            title="Aucun circuit ne correspond à la recherche"
          />
        } @else {
          <div class="table-wrap mt-4">
            <table class="data-table" style="--table-min: 40rem">
              <caption class="sr-only">Liste des circuits</caption>
              <thead>
                <tr>
                  <th scope="col">Image</th>
                  <th scope="col">Titre</th>
                  <th scope="col">Pays</th>
                  <th scope="col">Durée</th>
                  <th scope="col">Prix</th>
                  <th scope="col" class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (t of visible(); track t.id) {
                  <tr>
                    <td class="cell-image w-24">
                      <img
                        [src]="t.image"
                        alt=""
                        width="160"
                        height="100"
                        class="aspect-[16/10] w-20 rounded-field object-cover"
                        loading="lazy"
                      />
                    </td>
                    <th scope="row">{{ t.title }}</th>
                    <td data-label="Pays">{{ t.country }}</td>
                    <td data-label="Durée">{{ duration(t.duration) }}</td>
                    <td data-label="Prix" class="font-semibold text-ocean-950">{{ price(t.price) }}</td>
                    <td class="cell-actions">
                      <div class="flex justify-end gap-2">
                        <button type="button" class="btn-icon" title="Modifier" (click)="openEdit(t, $event)">
                          <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                            <path d="M3.5 16.5l.7-3.2L13.6 3.9a1.6 1.6 0 012.3 0l.2.2a1.6 1.6 0 010 2.3L6.7 15.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                          </svg>
                          <span class="sr-only">Modifier {{ t.title }}</span>
                        </button>
                        <button
                          type="button"
                          class="btn-icon btn-icon-danger"
                          title="Supprimer"
                          (click)="askDelete(t, $event)"
                        >
                          <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                            <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                          <span class="sr-only">Supprimer {{ t.title }}</span>
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
      [heading]="editing() ? 'Modifier le circuit' : 'Ajouter un circuit'"
      (closed)="onFormClosed()"
    >
      @if (formOpen() && formData(); as data) {
        <app-tour-form
          [tour]="editing()"
          [continents]="data.continents"
          [accommodations]="data.accommodations"
          [submitting]="saving()"
          [submitError]="saveError()"
          (saved)="save($event)"
          (cancelled)="formDialog.close()"
        />
      }
    </app-modal-dialog>

    <app-modal-dialog #deleteDialog heading="Supprimer ce circuit ?" (closed)="onDeleteClosed()">
      @if (pendingDelete(); as target) {
        <p class="mt-3 text-ocean-800">
          Le circuit « {{ target.title }} » sera retiré du catalogue. Les réservations existantes
          conservent leur snapshot (titre, dates et prix) et ne sont pas modifiées.
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
    </app-modal-dialog>
  `,
})
export class ToursAdminComponent {
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly formDialog = viewChild.required<ModalDialogComponent>('formDialog');
  private readonly deleteDialog = viewChild.required<ModalDialogComponent>('deleteDialog');

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly sorts = TOUR_SORTS;
  protected readonly duration = formatDuration;
  protected readonly price = formatPrice;

  protected readonly state = signal<ListState>({ status: 'loading' });
  protected readonly search = signal('');
  protected readonly sort = signal<TourSort>('title');

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Tour | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly pendingDelete = signal<Tour | null>(null);
  protected readonly deleting = signal(false);

  private subscription: Subscription | null = null;

  protected readonly ready = computed(() => this.state().status === 'ready');
  protected readonly tours = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.tours : [];
  });
  protected readonly formData = computed(() => {
    const state = this.state();
    return state.status === 'ready'
      ? { continents: state.continents, accommodations: state.accommodations }
      : null;
  });
  protected readonly visible = computed(() => filterTours(this.tours(), this.search(), this.sort()));

  constructor() {
    this.load();
  }

  protected errorMessage(): string {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  }

  protected load(): void {
    this.subscription?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.subscription = forkJoin({
      tours: this.catalog.getTours(),
      accommodations: this.catalog.getAccommodations(),
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
      this.sort.set(event.target.value as TourSort);
    }
  }

  // ----- Création / modification -----

  protected openCreate(_event: Event): void {
    this.editing.set(null);
    this.saveError.set(null);
    this.formOpen.set(true);
    this.formDialog().show();
  }

  protected openEdit(tour: Tour, _event: Event): void {
    this.editing.set(tour);
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

  protected save(input: TourInput): void {
    if (this.saving()) {
      return;
    }
    const current = this.editing();
    this.saving.set(true);
    this.saveError.set(null);

    const request: Observable<string | void> = current
      ? this.admin.updateTour(current.id, input)
      : this.admin.createTour(input);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        const id = current ? current.id : String(result);
        this.applySaved({ id, ...input });
        this.toast.show(current ? 'Circuit modifié.' : 'Circuit créé.');
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

  private applySaved(tour: Tour): void {
    this.state.update((state) => {
      if (state.status !== 'ready') {
        return state;
      }
      const exists = state.tours.some((t) => t.id === tour.id);
      return {
        ...state,
        tours: exists
          ? state.tours.map((t) => (t.id === tour.id ? tour : t))
          : [...state.tours, tour],
      };
    });
  }

  // ----- Suppression -----

  protected askDelete(tour: Tour, _event: Event): void {
    this.pendingDelete.set(tour);
    this.deleteDialog().show();
  }

  protected onDeleteClosed(): void {
    this.pendingDelete.set(null);
    this.deleting.set(false);
  }

  protected confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.admin
      .deleteTour(target.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.state.update((state) =>
            state.status === 'ready'
              ? { ...state, tours: state.tours.filter((t) => t.id !== target.id) }
              : state,
          );
          this.toast.show('Circuit supprimé.');
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
