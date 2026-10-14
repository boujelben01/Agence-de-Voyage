import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicateur d'étapes du parcours de réservation. */
@Component({
  selector: 'app-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ol
      class="relative flex items-center gap-2 text-sm font-medium sm:gap-3"
      aria-label="Étapes de la réservation"
    >
      @for (step of steps; track step; let i = $index) {
        <li
          class="flex items-center gap-2 sm:gap-3"
          [attr.aria-current]="current() === i + 1 ? 'step' : null"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            [class]="
              i + 1 < current()
                ? 'bg-ocean-700 text-white'
                : i + 1 === current()
                  ? 'bg-sand-300 text-ocean-950 ring-2 ring-ocean-700'
                  : 'bg-ocean-100 text-ocean-900'
            "
            aria-hidden="true"
          >
            @if (i + 1 < current()) {
              <svg viewBox="0 0 20 20" class="h-4 w-4">
                <path
                  d="M5 10.5l3.2 3.2L15 7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span
            [class]="
              i + 1 === current() ? 'text-ocean-950' : 'text-ocean-800 max-sm:sr-only'
            "
          >
            {{ step }}
            @if (i + 1 < current()) {
              <span class="sr-only">(terminée)</span>
            }
          </span>
          @if (i < steps.length - 1) {
            <span class="h-px w-5 bg-ocean-300 sm:w-10" aria-hidden="true"></span>
          }
        </li>
      }
    </ol>
  `,
})
export class StepsComponent {
  /** Étape en cours (1 à 3). */
  readonly current = input.required<1 | 2 | 3>();
  protected readonly steps = ['Circuit', 'Réservation', 'Confirmation'] as const;
}
