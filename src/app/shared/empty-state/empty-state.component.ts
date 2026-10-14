import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EmptyStateIcon = 'search' | 'calendar' | 'bed' | 'compass' | 'alert';

/**
 * État vide ou erreur de chargement : icône, titre, texte et actions (contenu projeté).
 * `alert` annonce le message aux lecteurs d'écran (erreurs).
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="empty-state"
      [class.empty-state-error]="tone() === 'error'"
      [attr.role]="alert() ? 'alert' : null"
    >
      <span class="empty-state-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          class="h-7 w-7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          @switch (icon()) {
            @case ('search') {
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            }
            @case ('calendar') {
              <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
              <path d="M8 3.5v4M16 3.5v4M4 10h16" />
            }
            @case ('bed') {
              <path d="M3 18V7M3 14h18v4M21 14v-2.5a2.5 2.5 0 00-2.5-2.5H11v5" />
              <circle cx="7" cy="11" r="1.6" />
            }
            @case ('compass') {
              <circle cx="12" cy="12" r="8.5" />
              <path d="M15.5 8.5l-2 5-5 2 2-5z" />
            }
            @default {
              <path d="M12 3.5l9 15.5H3z" />
              <path d="M12 10v4M12 16.6v.1" />
            }
          }
        </svg>
      </span>
      @switch (level()) {
        @case (1) {
          <h1 class="text-h2" [class]="tone() === 'error' ? 'text-red-900' : 'text-ocean-950'">
            {{ title() }}
          </h1>
        }
        @case (3) {
          <h3 class="text-h3" [class]="tone() === 'error' ? 'text-red-900' : 'text-ocean-950'">
            {{ title() }}
          </h3>
        }
        @default {
          <h2 class="text-h3" [class]="tone() === 'error' ? 'text-red-900' : 'text-ocean-950'">
            {{ title() }}
          </h2>
        }
      }
      @if (description()) {
        <p
          class="mx-auto mt-2 max-w-md"
          [class]="tone() === 'error' ? 'text-red-900' : 'text-ocean-800'"
        >
          {{ description() }}
        </p>
      }
      <div class="mt-6 flex flex-wrap justify-center gap-3 empty:hidden"><ng-content /></div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input<EmptyStateIcon>('compass');
  readonly tone = input<'neutral' | 'error'>('neutral');
  readonly alert = input(false);
  /** Niveau du titre : 1 quand l'état remplace toute la page, 3 sous un h2 de section. */
  readonly level = input<1 | 2 | 3>(2);
}
