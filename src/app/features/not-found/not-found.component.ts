import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Page 404 : toute URL inconnue. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <main
      id="contenu"
      tabindex="-1"
      class="relative isolate flex min-h-[24rem] flex-1 items-center overflow-hidden bg-linear-to-b from-ocean-50 to-white focus:outline-none"
    >
      <div class="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
        <div class="text-center md:text-left">
          <p class="eyebrow" role="status">Erreur 404</p>
          <h1 class="mt-4 text-balance text-h1 text-ocean-950">Cette page s’est perdue en voyage</h1>
          <p class="mx-auto mt-4 max-w-xl text-lead text-ocean-800 md:mx-0">
            L’adresse demandée n’existe pas ou n’existe plus. Retournez à l’accueil ou partez à la
            découverte de nos destinations.
          </p>
          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <a routerLink="/" class="btn-primary w-full sm:w-auto">Retour à l’accueil</a>
            <a routerLink="/destinations" class="btn-outline w-full sm:w-auto">Voir les destinations</a>
          </div>
        </div>

        <!-- Illustration : une carte, un tracé en pointillés qui s'interrompt et un point d'interrogation. -->
        <svg
          viewBox="0 0 480 360"
          class="mx-auto h-auto w-full max-w-md"
          role="img"
          aria-label="Illustration : un itinéraire en pointillés qui mène à un point d’interrogation sur une carte"
        >
          <rect x="20" y="30" width="440" height="300" rx="28" fill="#dcf0f8" />
          <circle cx="400" cy="85" r="26" fill="#efca77" />
          <path d="M20 270c60-48 110-52 170-22s120 38 180 4 70-28 90-18v96H48a28 28 0 01-28-28z" fill="#b9e0f0" />
          <path d="M20 300c70-30 130-26 200 4s130 20 240-14v40H48a28 28 0 01-28-28z" fill="#86c8e3" />
          <path d="M70 250l58-96 34 52 28-38 56 82z" fill="#154a65" />
          <path d="M128 154l16 26-16-6-14 8z" fill="#f0f8fc" />
          <path
            d="M82 288c46-12 70-48 112-62s64 6 104-22 38-62 68-78"
            fill="none"
            stroke="#145779"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="2 12"
          />
          <circle cx="82" cy="288" r="9" fill="#145779" />
          <circle cx="82" cy="288" r="3.5" fill="#ffffff" />
          <g transform="translate(366 66)">
            <path d="M0 44C-22 18-26-6-8-20c10-8 26-8 36 0 18 14 14 38-8 64z" fill="#0b2535" />
            <circle cx="10" cy="4" r="17" fill="#efca77" />
            <path d="M3.5-1.5c0-5 4-8 7-8s7 3 7 7c0 5-7 5-7 10M10.5 14.5v.1" fill="none" stroke="#0b2535" stroke-width="3" stroke-linecap="round" />
          </g>
        </svg>
      </div>
    </main>
  `,
})
export class NotFoundComponent {}
