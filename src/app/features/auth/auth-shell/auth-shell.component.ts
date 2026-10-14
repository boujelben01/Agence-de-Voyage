import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Mise en page des pages d'authentification : panneau visuel (bandeau au-dessus du formulaire sur
 * mobile, colonne de gauche dès 1024 px) et formulaire. Une seule image est chargée.
 */
@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-[calc(100svh-4rem)] lg:grid-cols-2">
      <div class="surface-dark relative isolate flex h-44 items-end overflow-hidden bg-ocean-950 sm:h-56 lg:h-auto">
        <img
          [src]="image()"
          alt=""
          class="absolute inset-0 -z-10 h-full w-full object-cover"
          width="1600"
          height="800"
          fetchpriority="high"
        />
        <div
          class="absolute inset-0 -z-10 bg-linear-to-t from-ocean-950/90 via-ocean-950/35 to-ocean-950/10"
        ></div>
        <div class="w-full p-5 text-white sm:p-8 lg:p-12">
          <p class="eyebrow">Agence de Voyage</p>
          <p class="mt-2 max-w-md text-balance text-lg font-semibold leading-snug tracking-tight sm:text-xl lg:mt-3 lg:text-h2">
            {{ caption() }}
          </p>
          <p class="mt-2 hidden max-w-md text-ocean-100 sm:block lg:mt-3">{{ subcaption() }}</p>
        </div>
      </div>

      <main id="contenu" tabindex="-1" class="flex items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-12">
        <div class="w-full max-w-md">
          <h1 class="text-h1 text-ocean-950">{{ heading() }}</h1>
          <p class="mt-3 text-ocean-800">{{ intro() }}</p>
          <div class="mt-8">
            <ng-content />
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AuthShellComponent {
  readonly image = input.required<string>();
  readonly heading = input.required<string>();
  readonly intro = input('');
  readonly caption = input('');
  readonly subcaption = input('');
}
