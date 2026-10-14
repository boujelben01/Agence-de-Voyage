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
import { Subscription } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { AdminService } from '../../core/services/admin.service';
import { ModalDialogComponent } from '../../shared/modal-dialog/modal-dialog.component';
import { ToastService } from '../../shared/toast/toast.service';
import { formatTravelers } from '../booking/booking-utils';
import { formatDate, formatPrice } from '../catalog/catalog-filters';
import { StatusFilter, filterReservations } from './admin-forms';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; reservations: Reservation[] };

/** Toutes les réservations : filtre par statut, recherche et annulation (pas de suppression). */
@Component({
  selector: 'app-reservations-admin',
  imports: [
    ModalDialogComponent,
    PageHeaderComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [compact]="true"
      eyebrow="Back-office"
      title="Réservations"
      description="Toutes les réservations des clients, de la plus lointaine à la plus proche."
    />

    @switch (state().status) {
      @case ('loading') {
        <div class="mt-8 space-y-3" role="status" aria-live="polite">
          <span class="sr-only">Chargement des réservations…</span>
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
          title="Impossible de charger les réservations"
          [description]="errorMessage()"
        >
          <button type="button" class="btn-primary" (click)="load()">Réessayer</button>
        </app-empty-state>
      }
      @case ('ready') {
        <div class="mt-8 grid gap-4 sm:grid-cols-[1fr_14rem]">
          <div>
            <label for="res-search" class="field-label">Rechercher</label>
            <input
              id="res-search"
              type="search"
              class="field-input"
              placeholder="E-mail ou référence"
              [value]="search()"
              (input)="onSearch($event)"
            />
          </div>
          <div>
            <label for="res-status" class="field-label">Statut</label>
            <select id="res-status" class="field-input" [value]="status()" (change)="onStatus($event)">
              <option value="all" [selected]="status() === 'all'">Tous</option>
              <option value="confirmed" [selected]="status() === 'confirmed'">Confirmées</option>
              <option value="cancelled" [selected]="status() === 'cancelled'">Annulées</option>
            </select>
          </div>
        </div>

        <p class="mt-5 text-sm font-medium text-ocean-800" role="status" aria-live="polite">
          {{ visible().length }} {{ visible().length > 1 ? 'réservations' : 'réservation' }}
        </p>

        @if (reservations().length === 0) {
          <app-empty-state
            class="mt-4"
            icon="calendar"
            title="Aucune réservation pour le moment"
            description="Les réservations des clients apparaîtront ici."
          />
        } @else if (visible().length === 0) {
          <app-empty-state
            class="mt-4"
            icon="search"
            title="Aucune réservation ne correspond"
            description="Modifiez le statut ou la recherche."
          />
        } @else {
          <div class="table-wrap mt-4">
            <table class="data-table" style="--table-min: 52rem">
              <caption class="sr-only">Liste des réservations</caption>
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Circuit</th>
                  <th scope="col">Dates</th>
                  <th scope="col">Voyageurs</th>
                  <th scope="col">Total</th>
                  <th scope="col">Statut</th>
                  <th scope="col" class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (r of visible(); track r.id) {
                  <tr>
                    <th scope="row">
                      {{ r.userEmail }}
                      <span class="block break-all font-mono text-xs font-normal text-ocean-800">{{ r.id }}</span>
                    </th>
                    <td data-label="Circuit">{{ r.tourTitle }}</td>
                    <td data-label="Dates">{{ date(r.startDate) }} → {{ date(r.endDate) }}</td>
                    <td data-label="Voyageurs">{{ travelers(r.travelers) }}</td>
                    <td data-label="Total" class="font-semibold text-ocean-950">{{ price(r.totalPrice) }}</td>
                    <td data-label="Statut">
                      <app-badge [tone]="r.status === 'confirmed' ? 'success' : 'danger'">{{
                        r.status === 'confirmed' ? 'Confirmée' : 'Annulée'
                      }}</app-badge>
                    </td>
                    <td class="cell-actions text-right">
                      @if (r.status === 'confirmed') {
                        <button
                          type="button"
                          class="btn-icon btn-icon-danger"
                          title="Annuler"
                          (click)="askCancel(r)"
                        >
                          <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                            <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                            <path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                          </svg>
                          <span class="sr-only">Annuler la réservation {{ r.id }}</span>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }

    <app-modal-dialog #cancelDialog heading="Annuler cette réservation ?" (closed)="onDialogClosed()">
      @if (pending(); as target) {
        <p class="mt-3 text-ocean-800">
          La réservation « {{ target.tourTitle }} » de {{ target.userEmail }}
          (départ le {{ date(target.startDate) }}, {{ price(target.totalPrice) }}) sera annulée.
          Cette action est définitive.
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" class="btn-outline btn-sm" (click)="cancelDialog.close()" [disabled]="cancelling()">
            Garder
          </button>
          <button type="button" class="btn-danger btn-sm" (click)="confirmCancel()" [disabled]="cancelling()">
            {{ cancelling() ? 'Annulation…' : 'Oui, annuler' }}
          </button>
        </div>
      }
    </app-modal-dialog>
  `,
})
export class ReservationsAdminComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelDialog = viewChild.required<ModalDialogComponent>('cancelDialog');

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly date = formatDate;
  protected readonly price = formatPrice;
  protected readonly travelers = formatTravelers;

  protected readonly state = signal<ListState>({ status: 'loading' });
  protected readonly search = signal('');
  protected readonly status = signal<StatusFilter>('all');
  protected readonly pending = signal<Reservation | null>(null);
  protected readonly cancelling = signal(false);

  private subscription: Subscription | null = null;

  protected readonly reservations = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.reservations : [];
  });
  protected readonly visible = computed(() =>
    filterReservations(this.reservations(), this.status(), this.search()),
  );

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
    this.subscription = this.admin
      .listAllReservations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reservations) => this.state.set({ status: 'ready', reservations }),
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

  protected onStatus(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.status.set(event.target.value as StatusFilter);
    }
  }

  protected askCancel(reservation: Reservation): void {
    this.pending.set(reservation);
    this.cancelDialog().show();
  }

  protected onDialogClosed(): void {
    this.pending.set(null);
    this.cancelling.set(false);
  }

  protected confirmCancel(): void {
    const target = this.pending();
    if (!target || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.admin
      .cancelReservation(target.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.state.update((state) =>
            state.status === 'ready'
              ? {
                  status: 'ready',
                  reservations: state.reservations.map((r) =>
                    r.id === target.id ? { ...r, status: 'cancelled' } : r,
                  ),
                }
              : state,
          );
          this.toast.show('Réservation annulée.');
          this.cancelDialog().close();
        },
        error: (error: unknown) => {
          this.toast.show(
            error instanceof Error ? error.message : "L'annulation a échoué. Veuillez réessayer.",
            'error',
          );
          this.cancelDialog().close();
        },
      });
  }
}
