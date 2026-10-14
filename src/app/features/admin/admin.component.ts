import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface AdminSection {
  label: string;
  link: string;
  exact: boolean;
  /** Tracé SVG (viewBox 24x24, trait). */
  path: string;
}

/** Mise en page du back-office : menu latéral (horizontal défilant sur mobile) et contenu. */
@Component({
  selector: 'app-admin',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-page flex flex-col gap-6 py-6 lg:flex-row lg:gap-10 lg:py-12">
      <aside class="lg:w-60 lg:shrink-0">
        <nav class="card relative p-2 lg:sticky lg:top-24 lg:p-3" aria-label="Menu d’administration">
          <p class="eyebrow hidden px-3 pb-3 pt-2 lg:flex">Back-office</p>
          <ul class="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            @for (section of sections; track section.link) {
              <li class="shrink-0">
                <a
                  [routerLink]="section.link"
                  routerLinkActive="bg-ocean-700 text-white hover:bg-ocean-700"
                  [routerLinkActiveOptions]="{ exact: section.exact }"
                  ariaCurrentWhenActive="page"
                  class="flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium text-ocean-900 transition-colors hover:bg-ocean-50"
                >
                  <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" aria-hidden="true">
                    <path
                      [attr.d]="section.path"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {{ section.label }}
                </a>
              </li>
            }
          </ul>
        </nav>
      </aside>

      <main id="contenu" tabindex="-1" class="min-w-0 flex-1 focus:outline-none">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminComponent {
  protected readonly sections: readonly AdminSection[] = [
    {
      label: 'Tableau de bord',
      link: '/admin',
      exact: true,
      path: 'M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-4H4z',
    },
    {
      label: 'Circuits',
      link: '/admin/circuits',
      exact: false,
      path: 'M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17h6a3 3 0 000-6h-2a3 3 0 010-6h6',
    },
    {
      label: 'Hébergements',
      link: '/admin/hebergements',
      exact: false,
      path: 'M3 20V8l6-4 6 4v12M15 20V12h6v8M7 12h4M7 16h4',
    },
    {
      label: 'Réservations',
      link: '/admin/reservations',
      exact: false,
      path: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 14l2 2 4-4',
    },
  ];
}
