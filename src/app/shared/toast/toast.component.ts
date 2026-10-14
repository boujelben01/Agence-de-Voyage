import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          animate.leave="animate-toast-out motion-reduce:animate-none"
          class="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card py-3 pl-4 pr-3 text-sm font-medium text-white shadow-lift motion-reduce:animate-none"
          [class.bg-ocean-800]="toast.kind === 'info'"
          [class.bg-emerald-800]="toast.kind === 'success'"
          [class.bg-red-800]="toast.kind === 'error'"
        >
          @if (toast.kind === 'error') {
            <svg viewBox="0 0 20 20" class="mt-0.5 h-5 w-5 shrink-0 text-red-200" aria-hidden="true">
              <path d="M10 2.5l8 14H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M10 8v4M10 14.2v.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          } @else if (toast.kind === 'success') {
            <svg viewBox="0 0 20 20" class="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true">
              <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M6 10.5l2.7 2.7L14 7.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          } @else {
            <svg viewBox="0 0 20 20" class="mt-0.5 h-5 w-5 shrink-0 text-sand-300" aria-hidden="true">
              <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M10 9v5M10 6.2v.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          }
          <span class="flex-1 leading-relaxed">{{ toast.message }}</span>
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full leading-none transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Fermer la notification"
            (click)="toasts.dismiss(toast.id)"
          >
            <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService);
}
