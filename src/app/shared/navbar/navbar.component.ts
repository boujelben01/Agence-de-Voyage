import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../logo/logo.component';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeAll()',
    '(document:click)': 'onDocumentClick($event)',
    '(window:scroll)': 'onScroll()',
  },
  template: `
    <a
      href="#contenu"
      (click)="skipToContent($event)"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-field focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ocean-800 focus:shadow-lift"
      >Aller au contenu</a
    >
    <header
      class="sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-200 motion-reduce:transition-none"
      [class]="
        scrolled()
          ? 'border-ocean-100 bg-white/95 shadow-soft'
          : 'border-transparent bg-white/75'
      "
    >
      <nav
        class="container-page flex items-center justify-between gap-4 transition-[height] duration-200 motion-reduce:transition-none"
        [class]="scrolled() ? 'h-14' : 'h-16'"
        aria-label="Navigation principale"
      >
        <a
          routerLink="/"
          class="flex items-center gap-2 whitespace-nowrap rounded-field text-base font-semibold tracking-tight text-ocean-800 sm:text-lg"
          (click)="closeAll()"
        >
          <app-logo />
          <span>Agence de Voyage</span>
        </a>

        <!-- Liens principaux : bureau -->
        <ul class="hidden items-center gap-1 md:flex">
          <li>
            <a
              routerLink="/"
              routerLinkActive="bg-ocean-50 text-ocean-800"
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-link"
              >Accueil</a
            >
          </li>
          <li>
            <a
              routerLink="/destinations"
              routerLinkActive="bg-ocean-50 text-ocean-800"
              class="nav-link"
              >Destinations</a
            >
          </li>
        </ul>

        <div class="flex items-center gap-2">
          <!-- Zone de hauteur fixe : pas de saut de mise en page pendant le chargement. -->
          <div class="flex min-h-10 items-center gap-2">
            @let profile = auth.profile();
            @if (profile === undefined) {
              <span class="h-9 w-20 animate-pulse rounded-full bg-ocean-100 sm:w-32" aria-hidden="true"></span>
              <span class="sr-only" role="status">Chargement…</span>
            } @else if (profile === null) {
              <a routerLink="/connexion" class="nav-link hidden sm:inline-flex">Connexion</a>
              <a
                routerLink="/inscription"
                class="btn-primary btn-sm hidden sm:inline-flex"
                >Inscription</a
              >
            } @else {
              <div class="relative">
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-full border border-ocean-200 bg-white py-1 pl-1 pr-3 transition-colors hover:bg-ocean-50"
                  aria-haspopup="menu"
                  [attr.aria-expanded]="userMenuOpen()"
                  aria-controls="user-menu"
                  (click)="toggleUserMenu()"
                >
                  <span
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-ocean-700 text-xs font-semibold text-white"
                    aria-hidden="true"
                    >{{ initials(profile.name) }}</span
                  >
                  <span class="hidden max-w-[10rem] truncate text-sm font-medium text-ocean-900 sm:inline">{{
                    profile.name
                  }}</span>
                  <span class="sr-only sm:hidden">{{ profile.name }}</span>
                  <svg
                    viewBox="0 0 20 20"
                    class="h-4 w-4 text-ocean-700 transition-transform"
                    [class.rotate-180]="userMenuOpen()"
                    aria-hidden="true"
                  >
                    <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>

                @if (userMenuOpen()) {
                  <div
                    id="user-menu"
                    role="menu"
                    class="absolute right-0 top-full z-50 mt-2 w-56 rounded-card bg-white p-2 shadow-lift ring-1 ring-ocean-100 motion-safe:animate-toast-in"
                  >
                    @if (profile.role === 'admin') {
                      <a
                        role="menuitem"
                        routerLink="/admin"
                        class="menu-item"
                        (click)="closeAll()"
                        >Administration</a
                      >
                    } @else {
                      <a
                        role="menuitem"
                        routerLink="/profil"
                        class="menu-item"
                        (click)="closeAll()"
                        >Mon profil</a
                      >
                    }
                    <button type="button" role="menuitem" class="menu-item w-full text-left" (click)="logout()">
                      Déconnexion
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Burger : mobile -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-ocean-800 transition-colors hover:bg-ocean-50 md:hidden"
            [attr.aria-expanded]="mobileOpen()"
            aria-controls="mobile-menu"
            [attr.aria-label]="mobileOpen() ? 'Fermer le menu' : 'Ouvrir le menu'"
            (click)="toggleMobile()"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6" aria-hidden="true">
              @if (mobileOpen()) {
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              } @else {
                <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              }
            </svg>
          </button>
        </div>
      </nav>

      @if (mobileOpen()) {
        <div id="mobile-menu" class="border-t border-ocean-100 bg-white md:hidden">
          <ul class="container-page flex flex-col gap-1 py-3">
            <li>
              <a routerLink="/" class="mobile-link" (click)="closeAll()">Accueil</a>
            </li>
            <li>
              <a routerLink="/destinations" class="mobile-link" (click)="closeAll()"
                >Destinations</a
              >
            </li>
            @if (auth.profile(); as profile) {
              <li>
                @if (profile.role === 'admin') {
                  <a routerLink="/admin" class="mobile-link" (click)="closeAll()">Administration</a>
                } @else {
                  <a routerLink="/profil" class="mobile-link" (click)="closeAll()">Mon profil</a>
                }
              </li>
              <li>
                <button type="button" class="mobile-link w-full text-left" (click)="logout()">
                  Déconnexion
                </button>
              </li>
            }
            @if (auth.profile() === null) {
              <li class="sm:hidden">
                <a routerLink="/connexion" class="mobile-link" (click)="closeAll()">Connexion</a>
              </li>
              <li class="sm:hidden">
                <a routerLink="/inscription" class="mobile-link font-semibold text-ocean-800" (click)="closeAll()"
                  >Inscription</a
                >
              </li>
            }
          </ul>
        </div>
      }
    </header>
  `,
  styles: `
    .nav-link {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-ocean-900);
      transition: background-color 150ms;
    }
    .nav-link:hover {
      background-color: var(--color-ocean-50);
    }
    .menu-item {
      display: block;
      border-radius: var(--radius-field);
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-ocean-900);
    }
    .menu-item:hover {
      background-color: var(--color-ocean-50);
    }
    .mobile-link {
      display: block;
      border-radius: var(--radius-field);
      padding: 0.75rem 0.75rem;
      font-weight: 500;
      color: var(--color-ocean-900);
    }
    .mobile-link:hover {
      background-color: var(--color-ocean-50);
    }
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  protected readonly mobileOpen = signal(false);
  /** Vrai dès que la page a défilé : la barre se condense et prend une ombre. */
  protected readonly scrolled = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected initials(name: string): string {
    const letters = name
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase());
    return letters.join('') || '?';
  }

  protected toggleMobile(): void {
    this.userMenuOpen.set(false);
    this.mobileOpen.update((open) => !open);
  }

  protected toggleUserMenu(): void {
    this.mobileOpen.set(false);
    this.userMenuOpen.update((open) => !open);
  }

  /**
   * Lien d'évitement : avec <base href="/">, un lien « #contenu » naviguerait vers la racine du
   * site ; on déplace donc le focus à la main.
   */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.closeAll();
    const main = this.document.getElementById('contenu');
    main?.focus();
    main?.scrollIntoView();
  }

  protected onScroll(): void {
    const scrolled = (this.document.defaultView?.scrollY ?? 0) > 8;
    if (scrolled !== this.scrolled()) {
      this.scrolled.set(scrolled);
    }
  }

  protected closeAll(): void {
    this.mobileOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected onDocumentClick(event: Event): void {
    const target = event.target;
    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeAll();
    }
  }

  protected async logout(): Promise<void> {
    this.closeAll();
    await this.auth.logout();
    this.toast.show('Vous avez été déconnecté.');
    await this.router.navigateByUrl('/');
  }
}
