import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteButtonComponent } from '../favorite-button/favorite-button.component';

/**
 * Carte de destination : image 4:3 avec badge de continent, titre, repères (durée, hébergement)
 * et prix. Avec `link`, le titre devient un lien étiré sur toute la carte ; sans `link`, la carte
 * est statique.
 */
@Component({
  selector: 'app-destination-card',
  imports: [RouterLink, FavoriteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <article
      class="card card-interactive group relative flex h-full flex-col overflow-hidden focus-within:ring-2 focus-within:ring-ocean-600"
    >
      @if (favoriteTourId(); as tourId) {
        <!-- Au-dessus du lien étiré (z-10) ; zone cliquable distincte de celle de la carte. -->
        <app-favorite-button class="absolute right-3 top-3 z-10" [tourId]="tourId" [title]="title()" />
      }
      <div class="relative aspect-[4/3] overflow-hidden bg-ocean-100">
        <img
          [src]="image()"
          [alt]="alt()"
          loading="lazy"
          decoding="async"
          width="800"
          height="600"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        @if (badge()) {
          <span
            class="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ocean-900 shadow-soft"
            >{{ badge() }}</span
          >
        }
      </div>

      <div class="flex flex-1 flex-col p-5">
        <p class="eyebrow">{{ region() }}</p>
        <h3 class="mt-2 text-h3 text-ocean-950">
          @if (link(); as target) {
            <a [routerLink]="target" class="rounded after:absolute after:inset-0">{{ title() }}</a>
          } @else {
            {{ title() }}
          }
        </h3>
        @if (tagline()) {
          <p class="mt-1.5 text-sm text-ocean-800">{{ tagline() }}</p>
        }

        @if (meta() || stay()) {
          <ul class="mt-4 space-y-1.5 text-sm text-ocean-800">
            @if (meta()) {
              <li class="flex items-center gap-2">
                <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-ocean-700" aria-hidden="true">
                  <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path d="M10 5.8V10l2.8 1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                {{ meta() }}
              </li>
            }
            @if (stay()) {
              <li class="flex items-center gap-2">
                <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-ocean-700" aria-hidden="true">
                  <path d="M2.5 15.5V5M2.5 12h15v3.5M17.5 12V9.8A1.8 1.8 0 0015.7 8H9v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span class="min-w-0 truncate">{{ stay() }}</span>
              </li>
            }
          </ul>
        }

        @if (price()) {
          <div class="mt-auto pt-5">
            <p class="flex items-baseline justify-between gap-3 border-t border-ocean-100 pt-4">
              <span class="text-caption text-ocean-800">À partir de</span>
              <span class="text-xl font-semibold tracking-tight text-ocean-950">{{ price() }}</span>
            </p>
          </div>
        }
      </div>
    </article>
  `,
})
export class DestinationCardComponent {
  readonly title = input.required<string>();
  readonly region = input.required<string>();
  readonly image = input.required<string>();
  readonly alt = input('');
  readonly tagline = input('');
  /** Durée, ex. « 5 jours ». */
  readonly meta = input('');
  /** Prix déjà formaté, ex. « 980 € » (le libellé « À partir de » est ajouté par la carte). */
  readonly price = input('');
  /** Badge posé sur l'image, ex. le continent. */
  readonly badge = input('');
  /** Hébergement associé, ex. « Hôtel · Hôtel du Louvre ». */
  readonly stay = input('');
  readonly link = input<string[] | null>(null);
  /** Id du circuit : affiche le bouton « favori » en haut à droite de l'image. */
  readonly favoriteTourId = input<string | null>(null);
}
