import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { ReservationService } from '../../core/services/reservation.service';
import { BookingConfirmationComponent } from './booking-confirmation.component';
import { ReservationsListComponent } from './reservations-list.component';

const LABEL = 'Télécharger le billet (PDF)';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    userId: 'u1',
    userEmail: 'ada@test.com',
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

function ticketLinks(root: HTMLElement): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll('a')).filter((a) => (a.textContent ?? '').includes(LABEL));
}

async function renderList(list$: Observable<Reservation[]>): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [ReservationsListComponent],
    providers: [
      provideRouter([]),
      { provide: ReservationService, useValue: { listMine: () => list$, cancel: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(ReservationsListComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

async function renderConfirmation(item: Reservation): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [BookingConfirmationComponent],
    providers: [
      provideRouter([]),
      { provide: ReservationService, useValue: { getMine: () => of(item) } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ id: item.id })),
          snapshot: { paramMap: convertToParamMap({ id: item.id }) },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(BookingConfirmationComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('bouton « Télécharger le billet (PDF) »', () => {
  it('apparaît sur chaque réservation confirmée du profil, pas sur les annulées', async () => {
    const root = await renderList(
      of([
        reservation({ id: 'r1' }),
        reservation({ id: 'r2', tourTitle: 'Safari au Kenya', status: 'cancelled' }),
        reservation({ id: 'r3', tourTitle: 'Rome' }),
      ]),
    );
    const links = ticketLinks(root);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/billet/r1', '/billet/r3']);
  });

  it('apparaît sur la confirmation d’une réservation confirmée', async () => {
    const root = await renderConfirmation(reservation());
    const links = ticketLinks(root);
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/billet/r1');
  });

  it('est absent de la confirmation d’une réservation annulée', async () => {
    const root = await renderConfirmation(reservation({ status: 'cancelled' }));
    expect(ticketLinks(root)).toHaveLength(0);
  });
});
