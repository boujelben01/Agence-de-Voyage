import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * En-tête de page : surtitre, h1 unique, description et actions (contenu projeté).
 * `compact` : variante sans bandeau pour le back-office. `tabs` : retire le padding bas pour
 * accoler une barre d'onglets projetée avec `slot="below"`.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (compact()) {
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          @if (eyebrow()) {
            <p class="eyebrow">{{ eyebrow() }}</p>
          }
          <h1 class="mt-1 text-balance text-h2 text-ocean-950">{{ title() }}</h1>
          @if (description()) {
            <p class="mt-2 max-w-2xl text-ocean-800">{{ description() }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-3 empty:hidden"><ng-content /></div>
      </header>
    } @else {
      <header class="page-header">
        <div
          class="relative z-10 py-10 sm:py-14"
          [class]="narrow() ? 'container-narrow' : 'container-page'"
          [class.pb-0]="tabs()"
          [class.sm:pb-0]="tabs()"
        >
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div class="min-w-0">
              @if (eyebrow()) {
                <p class="eyebrow">{{ eyebrow() }}</p>
              }
              <h1 class="page-header-title">{{ title() }}</h1>
              @if (description()) {
                <p class="page-header-desc">{{ description() }}</p>
              }
            </div>
            <div class="flex flex-wrap items-center gap-3 empty:hidden"><ng-content /></div>
          </div>
          <ng-content select="[slot=below]" />
        </div>
      </header>
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
  readonly compact = input(false);
  readonly narrow = input(false);
  readonly tabs = input(false);
}
