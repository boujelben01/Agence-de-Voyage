import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, kind: ToastKind = 'success'): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), DURATION_MS);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
