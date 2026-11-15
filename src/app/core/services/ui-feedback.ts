import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  danger: boolean;
  /** Sans bouton d'annulation : simple message à lire. */
  infoOnly: boolean;
  resolve: (confirmed: boolean) => void;
}

/** Petits retours à l'écran : message bref en bas (toast) et demande de confirmation. Affichés par AppComponent. */
@Injectable({ providedIn: 'root' })
export class UiFeedback {
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly toastMessage = signal<string | null>(null);
  readonly confirmRequest = signal<ConfirmRequest | null>(null);

  toast(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage.set(message);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 2200);
  }

  confirm(message: string, confirmLabel: string, danger = false): Promise<boolean> {
    return this.ask({ message, confirmLabel, danger, infoOnly: false });
  }

  inform(message: string): Promise<boolean> {
    return this.ask({ message, confirmLabel: 'OK', danger: false, infoOnly: true });
  }

  answer(confirmed: boolean): void {
    this.confirmRequest()?.resolve(confirmed);
    this.confirmRequest.set(null);
  }

  private ask(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    this.confirmRequest()?.resolve(false);
    return new Promise((resolve) => this.confirmRequest.set({ ...request, resolve }));
  }

  async copy(value: string, done = 'Copié'): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.toast(done);
    } catch {
      this.toast('Copie impossible');
    }
  }
}
