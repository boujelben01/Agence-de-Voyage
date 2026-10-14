import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Pastille du logo : motif identique à public/favicon.svg (disque, vague et voile). */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0 h-8 w-8' },
  template: `
    <svg viewBox="0 0 32 32" class="h-full w-full" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="15" [attr.fill]="colors().disc" />
      <path
        d="M5 20c3-3 6-3 9 0s6 3 9 0 4-2 4-2"
        fill="none"
        [attr.stroke]="colors().mark"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <path d="M16 6l3 8h-6z" [attr.fill]="colors().mark" />
    </svg>
  `,
})
export class LogoComponent {
  /** « ocean » : disque bleu et motif sable (fond clair) ; « sand » : disque sable et motif sombre (fond sombre). */
  readonly tone = input<'ocean' | 'sand'>('ocean');

  protected readonly colors = computed(() =>
    this.tone() === 'sand'
      ? { disc: '#efca77', mark: '#0b2535' }
      : { disc: '#145779', mark: '#efca77' },
  );
}
