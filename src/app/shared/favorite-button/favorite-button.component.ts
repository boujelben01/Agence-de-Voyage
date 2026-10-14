import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ToastService } from '../toast/toast.service';

/**
 * Bouton cœur « Ajouter/Retirer des favoris ». Masqué pour un administrateur ; un visiteur est
 * renvoyé vers la connexion (avec retour sur la page courante).
 */
@Component({
  selector: 'app-favorite-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (visible()) {
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-full bg-white/95 text-ocean-900 shadow-soft transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/40 motion-reduce:transition-none"
        [class]="showLabel() ? 'h-11 px-4 text-sm font-semibold' : 'h-11 w-11'"
        [attr.aria-pressed]="pressed()"
        [attr.aria-label]="label()"
        (click)="onClick()"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5 shrink-0"
          [class.text-red-600]="pressed()"
          aria-hidden="true"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
          [attr.fill]="pressed() ? 'currentColor' : 'none'"
        >
          <path
            d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0112 6.2 5.5 5.5 0 0121.5 12c-2.5 4.65-9.5 9-9.5 9z"
          />
        </svg>
        @if (showLabel()) {
          <span>Favoris</span>
        }
      </button>
    }
  `,
})
export class FavoriteButtonComponent {
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly tourId = input.required<string>();
  /** Titre du circuit, utilisé dans le nom accessible du bouton. */
  readonly title = input('');
  /** Affiche le mot « Favoris » à côté du cœur. */
  readonly showLabel = input(false);

  protected readonly visible = computed(() => this.auth.profile()?.role !== 'admin');
  protected readonly pressed = computed(() => this.favorites.ids().has(this.tourId()));
  protected readonly label = computed(() => {
    const subject = this.title() ? `« ${this.title()} »` : 'ce circuit';
    return this.pressed()
      ? `Retirer ${subject} des favoris`
      : `Ajouter ${subject} aux favoris`;
  });

  protected onClick(): void {
    const profile = this.auth.profile();
    if (profile === undefined) {
      return;
    }
    if (profile === null) {
      this.toast.show('Connectez-vous pour enregistrer vos circuits favoris.', 'info');
      void this.router.navigate(['/connexion'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    void this.favorites.toggle(this.tourId());
  }
}
