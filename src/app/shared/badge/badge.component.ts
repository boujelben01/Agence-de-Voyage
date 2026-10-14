import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'success' | 'danger' | 'neutral' | 'accent';

/** Pastille de statut : le texte porte toujours l'information, la couleur la renforce. */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `<span [class]="'badge-' + tone()"><ng-content /></span>`,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
}
