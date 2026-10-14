import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Boîte de dialogue modale native (`<dialog>`) : focus piégé par le navigateur, fermeture par Échap,
 * et focus rendu à l'élément qui l'a ouverte. Le contenu est projeté sous le titre.
 */
@Component({
  selector: 'app-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="dialog"
      [class.max-w-md]="size() === 'sm'"
      [class.max-w-3xl]="size() === 'lg'"
      [attr.aria-labelledby]="titleId"
      (close)="onClose()"
    >
      <div class="max-h-[85svh] overflow-y-auto p-6 sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 [id]="titleId" class="dialog-title">{{ heading() }}</h2>
          <button
            type="button"
            class="btn-icon -mr-2 -mt-1 h-9 w-9 border-transparent"
            aria-label="Fermer la boîte de dialogue"
            (click)="close()"
          >
            <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class ModalDialogComponent {
  readonly heading = input.required<string>();
  readonly size = input<'sm' | 'lg'>('sm');
  /** Émis à chaque fermeture (bouton, Échap, appel à close()). */
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;

  show(): void {
    const active = document.activeElement;
    this.opener = active instanceof HTMLElement ? active : null;
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  close(): void {
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      this.onClose();
    }
  }

  protected onClose(): void {
    const opener = this.opener;
    this.opener = null;
    if (opener?.isConnected) {
      opener.focus();
    }
    this.closed.emit();
  }
}
