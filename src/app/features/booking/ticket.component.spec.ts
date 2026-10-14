import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { UserProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ReservationService } from '../../core/services/reservation.service';
import { TicketComponent } from './ticket.component';

const profile: UserProfile = { uid: 'u1', email: 'ada@test.com', name: 'Ada Lovelace', role: 'user' };

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
    createdAt: new Date('2026-06-15T12:00:00Z'),
    ...overrides,
  };
}

async function render(result$: Observable<Reservation | null>) {
  const getMine = vi.fn(() => result$);
  TestBed.configureTestingModule({
    imports: [TicketComponent],
    providers: [
      provideRouter([]),
      { provide: ReservationService, useValue: { getMine } },
      { provide: AuthService, useValue: { profile: signal<UserProfile | null>(profile) } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ id: 'r1' })),
          snapshot: { paramMap: convertToParamMap({ id: 'r1' }) },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(TicketComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, getMine };
}

function text(root: HTMLElement): string {
  return (root.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('TicketComponent', () => {
  it('affiche le billet : référence, circuit, dates, voyageurs, total, titulaire et mention', async () => {
    const { root, getMine } = await render(of(reservation()));
    const content = text(root);

    expect(getMine).toHaveBeenCalledWith('r1');
    expect(root.querySelector('#ticket-reference')?.textContent?.trim()).toBe('r1');
    expect(content).toContain('Romance à Paris');
    expect(content).toContain('France');
    expect(content).toContain('Ada Lovelace');
    expect(content).toContain('1 juillet 2026');
    expect(content).toContain('5 juillet 2026');
    expect(content).toContain('2 voyageurs');
    expect(content).toContain('Confirmée');
    expect(content).toContain('Document de démonstration, sans valeur contractuelle');
    expect(content).toContain('Enregistrer au format PDF');
    // Pas de faux QR code.
    expect(root.querySelector('canvas, img, [class*="qr" i]')).toBeNull();
  });

  it('nomme le document « Billet-<référence> »', async () => {
    await render(of(reservation()));
    expect(TestBed.inject(Title).getTitle()).toBe('Billet-r1');
  });

  it('n’imprime pas à l’ouverture mais au clic sur le bouton', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { root } = await render(of(reservation()));
    expect(print).not.toHaveBeenCalled();

    const button = Array.from(root.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Imprimer / Enregistrer en PDF'),
    );
    expect(button).toBeDefined();
    button?.click();
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it('n’affiche aucun billet pour une réservation annulée', async () => {
    const { root } = await render(of(reservation({ status: 'cancelled' })));
    expect(root.querySelector('#ticket-reference')).toBeNull();
    expect(root.querySelector('.ticket-sheet')).toBeNull();
    expect(text(root)).toContain('Aucun billet pour une réservation annulée');
    expect(Array.from(root.querySelectorAll('button')).some((b) => (b.textContent ?? '').includes('Imprimer'))).toBe(false);
  });

  it('affiche une 404 pour une réservation inconnue ou étrangère', async () => {
    const { root } = await render(of(null));
    expect(root.querySelector('.ticket-sheet')).toBeNull();
    expect(text(root)).toContain('Erreur 404');
    expect(text(root)).toContain('Billet introuvable');
  });

  it('affiche une erreur si la lecture échoue', async () => {
    const { root } = await render(throwError(() => new Error('boom')));
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(text(root)).toContain('Impossible de charger le billet');
  });
});
