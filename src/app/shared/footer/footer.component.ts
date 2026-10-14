import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="surface-dark bg-ocean-950 text-ocean-100">
      <div class="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr]">
        <div class="sm:col-span-2 lg:col-span-1">
          <p class="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white">
            <app-logo tone="sand" />
            Agence de Voyage
          </p>
          <p class="mt-4 max-w-sm text-sm leading-relaxed text-ocean-200">
            Des voyages pensés avec soin, pour découvrir le monde sans compromis sur le confort.
          </p>
        </div>

        <nav aria-label="Pied de page : explorer">
          <h2 class="text-xs font-semibold uppercase tracking-[0.18em] text-sand-300">Explorer</h2>
          <ul class="mt-4 space-y-3 text-sm">
            <li><a routerLink="/" class="footer-link">Accueil</a></li>
            <li><a routerLink="/destinations" class="footer-link">Destinations</a></li>
          </ul>
        </nav>

        <nav aria-label="Pied de page : compte">
          <h2 class="text-xs font-semibold uppercase tracking-[0.18em] text-sand-300">Mon compte</h2>
          <ul class="mt-4 space-y-3 text-sm">
            <li><a routerLink="/connexion" class="footer-link">Connexion</a></li>
            <li><a routerLink="/inscription" class="footer-link">Inscription</a></li>
          </ul>
        </nav>
      </div>

      <div class="border-t border-white/10">
        <p class="container-page py-5 text-xs text-ocean-200">
          © {{ year }} Agence de Voyage. Projet de démonstration.
        </p>
      </div>
    </footer>
  `,
  styles: `
    .footer-link {
      border-radius: 0.375rem;
      color: var(--color-ocean-100);
      transition: color 150ms;
    }
    .footer-link:hover {
      color: #ffffff;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  `,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
