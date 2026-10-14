import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Titre de section (h2) avec surtitre et chapeau optionnels. */
@Component({
  selector: 'app-section-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div [class.text-center]="align() === 'center'">
      @if (eyebrow()) {
        <p class="eyebrow">{{ eyebrow() }}</p>
      }
      <h2 [id]="titleId()" class="section-title" [class.mt-3]="!!eyebrow()">{{ title() }}</h2>
      @if (description()) {
        <p class="section-lead" [class.mx-auto]="align() === 'center'">{{ description() }}</p>
      }
    </div>
  `,
})
export class SectionTitleComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
  /** Identifiant du h2, pour aria-labelledby sur la section. */
  readonly titleId = input<string | null>(null);
  readonly align = input<'left' | 'center'>('left');
}
