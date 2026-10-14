import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { ReservationError, ReservationService } from '../../core/services/reservation.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ReservationsListComponent } from './reservations-list.component';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    userId: 'u1',
    userEmail: 'u@test.com',
    tourId: '2',
    tourTitle: 'Romance à Paris',
    tourImage: 'images/paris.jpg',
    country: 'France',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    travelers: 2,
    pricePerPerson: 980,
    totalPrice: 1960,
    status: 'confirmed',
    createdAt: null,
    ...overrides,
  };
}

async function setup(
  list$: Observable<Reservation[]>,
  cancel: (id: string) => Observable<void> = () => of(undefined),
) {
  const cancelSpy = vi.fn(cancel);
  TestBed.configureTestingModule({
    imports: [ReservationsListComponent],
    providers: [
      provideRouter([]),
      { provide: ReservationService, useValue: { listMine: () => list$, cancel: cancelSpy } },
    ],
  });
  const fixture = TestBed.createComponent(ReservationsListComponent);
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  return {
    root: fixture.nativeElement as HTMLElement,
    cancelSpy,
    toast: TestBed.inject(ToastService),
    settle,
  };
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  );
  if (!found) {
    throw new Error(`bouton introuvable : ${text}`);
  }
  return found;
}

describe('ReservationsListComponent', () => {
  it('affiche les réservations avec leur statut', async () => {
    const { root } = await setup(
      of([
        reservation(),
        reservation({ id: 'r2', status: 'cancelled', tourTitle: 'Safari au Kenya' }),
      ]),
    );
    expect(root.textContent).toContain('Romance à Paris');
    expect(root.textContent).toContain('Confirmée');
    expect(root.textContent).toContain('Annulée');
    expect(root.textContent).toContain('2 réservations');
  });

  it('affiche l’état vide avec un lien vers les destinations', async () => {
    const { root } = await setup(of([]));
    expect(root.textContent).toContain('pas encore de réservation');
    expect(root.querySelector('a[href="/destinations"]')).not.toBeNull();
  });

  it('affiche l’état d’erreur avec le message du service', async () => {
    const { root } = await setup(throwError(() => new ReservationError('Lecture impossible.')));
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Lecture impossible.');
    expect(root.textContent).toContain('Réessayer');
  });

  it('demande confirmation avant d’annuler puis met à jour le statut', async () => {
    const { root, cancelSpy, toast, settle } = await setup(of([reservation()]));

    buttonByText(root, 'Annuler').click();
    await settle();
    expect(cancelSpy).not.toHaveBeenCalled();
    expect(root.querySelector('dialog')?.textContent).toContain('Annuler cette réservation ?');

    buttonByText(root, 'Oui, annuler').click();
    await settle();

    expect(cancelSpy).toHaveBeenCalledWith('r1');
    expect(root.textContent).toContain('Annulée');
    expect(toast.toasts().at(-1)?.kind).toBe('success');
  });

  it('n’annule rien si l’utilisateur garde sa réservation', async () => {
    const { root, cancelSpy, settle } = await setup(of([reservation()]));
    buttonByText(root, 'Annuler').click();
    await settle();
    buttonByText(root, 'Garder ma réservation').click();
    await settle();

    expect(cancelSpy).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Confirmée');
  });

  it('affiche un toast d’erreur si l’annulation échoue et garde le statut', async () => {
    const { root, toast, settle } = await setup(of([reservation()]), () =>
      throwError(() => new ReservationError('Annulation refusée.')),
    );
    buttonByText(root, 'Annuler').click();
    await settle();
    buttonByText(root, 'Oui, annuler').click();
    await settle();

    const last = toast.toasts().at(-1);
    expect(last?.kind).toBe('error');
    expect(last?.message).toBe('Annulation refusée.');
    expect(root.textContent).toContain('Confirmée');
  });
});
