import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Bloc de chargement décoratif : la taille se règle avec les classes de l'élément hôte. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'skeleton block animate-pulse motion-reduce:animate-none', 'aria-hidden': 'true' },
  template: '',
})
export class SkeletonComponent {}
