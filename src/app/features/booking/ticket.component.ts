import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { AuthService } from '../../core/services/auth.service';
import { ReservationService } from '../../core/services/reservation.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LogoComponent } from '../../shared/logo/logo.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { RESERVATIONS_TAB_PARAM } from '../profile/profile-tabs';
import { Ticket, buildTicket, isTicketAvailable, ticketDocumentTitle } from './ticket';

type TicketState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'cancelled' }
  | { status: 'ready'; reservation: Reservation };

/**
 * Billet de réservation prêt à imprimer (A4 portrait). Visible uniquement par le propriétaire de
 * la réservation ; absent pour une réservation annulée. Aucune impression automatique : le bouton
 * appelle window.print() et le navigateur propose « Enregistrer au format PDF ».
 *
 * Les styles d'impression sont globaux (ViewEncapsulation.None) mais ne sont chargés que tant que
 * cette page est affichée, ce qui évite de modifier l'impression des autres pages.
 */
@Component({
  selector: 'app-ticket',
  imports: [RouterLink, EmptyStateComponent, LogoComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .ticket-sheet {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm;
      }
      html,
      body {
        background: #fff !important;
      }
      app-navbar,
      app-footer,
      app-toast,
      .no-print {
        display: none !important;
      }
      .min-h-screen {
        min-height: 0 !important;
      }
      .ticket-page {
        padding: 0 !important;
        margin: 0 !important;
        max-width: none !important;
      }
      .ticket-sheet {
        box-shadow: none !important;
        margin: 0 !important;
        max-width: none !important;
        break-inside: avoid;
        page-break-inside: avoid;
        page-break-after: avoid;
      }
    }
  `,
  template: `
    <main id="contenu" tabindex="-1" class="ticket-page container-narrow section-tight focus:outline-none">
      @switch (state().status) {
        @case ('loading') {
          <div role="status" aria-live="polite">
            <h1 class="sr-only">Chargement du billet…</h1>
            <app-skeleton class="h-[32rem] rounded-card" />
          </div>
        }
        @case ('error') {
          <app-empty-state
            class="no-print"
            tone="error"
            icon="alert"
            [alert]="true"
            [level]="1"
            title="Impossible de charger le billet"
            description="Une erreur est survenue. Vérifiez votre connexion puis consultez vos réservations."
          >
            <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-primary">Mes réservations</a>
          </app-empty-state>
        }
        @case ('not-found') {
          <div class="no-print text-center">
            <p class="eyebrow">Erreur 404</p>
            <h1 class="mt-3 text-h1 text-ocean-950">Billet introuvable</h1>
            <p class="mx-auto mt-3 max-w-xl text-lead text-ocean-800">
              Cette réservation n’existe pas ou n’est pas associée à votre compte.
            </p>
            <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-primary mt-8">Mes réservations</a>
          </div>
        }
        @case ('cancelled') {
          <div class="no-print text-center">
            <h1 class="text-h1 text-ocean-950">Aucun billet pour une réservation annulée</h1>
            <p class="mx-auto mt-3 max-w-xl text-lead text-ocean-800">
              Le billet n’est disponible que pour les réservations confirmées.
            </p>
            <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-primary mt-8">Mes réservations</a>
          </div>
        }
        @case ('ready') {
          @if (ticket(); as t) {
            <div class="no-print">
              <h1 class="text-h2 text-ocean-950">Votre billet</h1>
              <p class="mt-2 text-ocean-800">
                Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».
              </p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button type="button" class="btn-primary" (click)="print()">
                  Imprimer / Enregistrer en PDF
                </button>
                <a routerLink="/profil" [queryParams]="reservationsTab" class="btn-outline">
                  Mes réservations
                </a>
              </div>
            </div>

            <article
              class="ticket-sheet mx-auto mt-8 w-full max-w-[190mm] overflow-hidden border border-ocean-200 bg-white text-black shadow-lift"
              aria-labelledby="ticket-title"
            >
              <header class="flex items-center justify-between gap-4 border-t-8 border-ocean-700 px-8 py-6">
                <div class="flex items-center gap-3">
                  <app-logo />
                  <span class="text-lg font-semibold">Agence de Voyage</span>
                </div>
                <p class="text-right text-sm font-semibold uppercase tracking-[0.18em]">
                  Billet de réservation
                </p>
              </header>

              <div class="bg-sand-100 px-8 py-5">
                <p class="text-xs font-semibold uppercase tracking-[0.18em]">Référence</p>
                <p id="ticket-reference" class="mt-1 break-all font-mono text-3xl font-bold tracking-wide">
                  {{ t.reference }}
                </p>
              </div>

              <div class="px-8 py-6">
                <p class="text-xs font-semibold uppercase tracking-[0.18em]">{{ t.country }}</p>
                <h2 id="ticket-title" class="mt-1 text-2xl font-bold">{{ t.tourTitle }}</h2>

                <dl class="mt-6 grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Titulaire</dt>
                    <dd class="mt-1 text-base font-medium">{{ t.holder || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Statut</dt>
                    <dd class="mt-1 text-base font-medium">{{ t.statusLabel }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Départ</dt>
                    <dd class="mt-1 text-base font-medium">{{ t.departure }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Retour</dt>
                    <dd class="mt-1 text-base font-medium">{{ t.returnDate }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Voyageurs</dt>
                    <dd class="mt-1 text-base font-medium">{{ t.travelersLabel }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Prix par personne</dt>
                    <dd class="mt-1 text-base font-medium">{{ t.pricePerPerson }}</dd>
                  </div>
                  @if (t.issuedOn) {
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-ocean-900">Réservé le</dt>
                      <dd class="mt-1 text-base font-medium">{{ t.issuedOn }}</dd>
                    </div>
                  }
                </dl>

                <div class="mt-8 flex items-baseline justify-between gap-4 border-t-2 border-ocean-700 pt-4">
                  <p class="text-base font-semibold">Total</p>
                  <p id="ticket-total" class="text-3xl font-bold">{{ t.total }}</p>
                </div>
              </div>

              <footer class="border-t border-ocean-200 px-8 py-4 text-center text-xs">
                Document de démonstration, sans valeur contractuelle.
              </footer>
            </article>
          }
        }
      }
    </main>
  `,
})
export class TicketComponent {
  private readonly reservations = inject(ReservationService);
  /** Lecture seule : nom du titulaire. */
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly reservationsTab = { onglet: RESERVATIONS_TAB_PARAM };
  protected readonly state = signal<TicketState>({ status: 'loading' });

  protected readonly ticket = computed<Ticket | null>(() => {
    const state = this.state();
    if (state.status !== 'ready') {
      return null;
    }
    return buildTicket(state.reservation, this.auth.profile()?.name ?? '');
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          this.state.set({ status: 'loading' });
          if (id === '') {
            return of<TicketState>({ status: 'not-found' });
          }
          return this.reservations.getMine(id).pipe(
            map((reservation): TicketState => {
              if (reservation === null) {
                return { status: 'not-found' };
              }
              return isTicketAvailable(reservation)
                ? { status: 'ready', reservation }
                : { status: 'cancelled' };
            }),
            catchError(() => of<TicketState>({ status: 'error' })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.state.set(state);
        if (state.status === 'ready') {
          // Le titre du document nomme le fichier proposé par « Enregistrer au format PDF ».
          this.title.setTitle(ticketDocumentTitle(state.reservation.id));
        }
      });
  }

  protected print(): void {
    this.document.defaultView?.print();
  }
}
