import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Tour } from '../../core/models/tour.model';
import { CatalogService } from '../../core/services/catalog.service';
import { ReservationError, ReservationService } from '../../core/services/reservation.service';
import { BookingFormComponent } from './booking-form.component';
import { addDays, todayIso } from './booking-utils';

const tour: Tour = {
  id: '2',
  title: 'Romance à Paris',
  country: 'France',
  continent: 'Europe',
  price: 1000,
  duration: 5,
  image: 'images/paris.jpg',
  description: '',
  itinerary: [],
  accommodationId: '1',
};

async function setup(
  tour$: Observable<Tour | null> = of(tour),
  create: (t: Tour, s: string, n: number) => Observable<string> = () => of('res-1'),
) {
  const createSpy = vi.fn(create);
  TestBed.configureTestingModule({
    imports: [BookingFormComponent],
    providers: [
      provideRouter([]),
      { provide: CatalogService, useValue: { getTour: () => tour$ } },
      { provide: ReservationService, useValue: { create: createSpy } },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ tourId: '2' })) },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(BookingFormComponent);
  const detect = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await detect();
  return { create: createSpy, navigate, root: fixture.nativeElement as HTMLElement, detect };
}

function type(root: HTMLElement, id: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`champ introuvable : ${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

function submit(root: HTMLElement): void {
  root
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

const validDate = (): string => addDays(todayIso(), 10) ?? '';

describe('BookingFormComponent', () => {
  it('affiche le total en direct à partir du prix et des voyageurs', async () => {
    const { root, detect } = await setup();
    type(root, 'booking-travelers', '3');
    await detect();
    const total = root.querySelector('#booking-total')?.textContent ?? '';
    expect(total.replace(/\s/g, '')).toContain('3000');
  });

  it('affiche la date de retour une fois le départ valide', async () => {
    const { root, detect } = await setup();
    type(root, 'booking-start', validDate());
    await detect();
    expect(root.textContent).toContain('Retour');
  });

  it('refuse l’envoi avec une date passée et affiche l’erreur accessible', async () => {
    const { root, create, detect } = await setup();
    type(root, 'booking-start', '2020-01-01');
    submit(root);
    await detect();

    expect(create).not.toHaveBeenCalled();
    expect(root.querySelector('#booking-start')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#booking-start-error')?.textContent).toContain(
      'à partir de demain',
    );
  });

  it('refuse un nombre de voyageurs hors bornes', async () => {
    const { root, create, detect } = await setup();
    type(root, 'booking-start', validDate());
    type(root, 'booking-travelers', '11');
    submit(root);
    await detect();

    expect(create).not.toHaveBeenCalled();
    expect(root.querySelector('#booking-travelers-error')?.textContent).toContain(
      'entre 1 et 10',
    );
  });

  it('crée la réservation sans transmettre de total, puis redirige', async () => {
    const { root, create, navigate, detect } = await setup();
    const date = validDate();
    type(root, 'booking-start', date);
    type(root, 'booking-travelers', '4');
    submit(root);
    await detect();

    expect(create).toHaveBeenCalledWith(tour, date, 4);
    expect(navigate).toHaveBeenCalledWith(['/confirmation', 'res-1']);
  });

  it('affiche l’erreur du service et reste sur la page', async () => {
    const { root, navigate, detect } = await setup(of(tour), () =>
      throwError(() => new ReservationError('Action refusée.')),
    );
    type(root, 'booking-start', validDate());
    submit(root);
    await detect();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Action refusée.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('affiche une 404 si le circuit n’existe pas', async () => {
    const { root } = await setup(of(null));
    expect(root.textContent).toContain('Ce circuit n’existe pas');
    expect(root.querySelector('form')).toBeNull();
  });

  it('affiche l’état d’erreur si le catalogue est indisponible', async () => {
    const { root } = await setup(throwError(() => new Error('boom')));
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Impossible de charger');
  });
});
