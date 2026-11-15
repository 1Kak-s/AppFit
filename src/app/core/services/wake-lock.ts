import { effect, inject, Injectable } from '@angular/core';
import { CarnetStore } from '../state/carnet.store';

/** Garde l'écran allumé pendant que l'app est ouverte, si le réglage est activé. */
@Injectable({ providedIn: 'root' })
export class WakeLock {
  private readonly store = inject(CarnetStore);
  private sentinel: WakeLockSentinel | null = null;

  constructor() {
    effect(() => this.sync(this.store.hasProfile() && this.store.settings().keepAwake));
    // Le navigateur relâche le verrou quand l'app passe en arrière-plan : on le redemande au retour.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible')
        this.sync(this.store.hasProfile() && this.store.settings().keepAwake);
    });
  }

  private sync(wanted: boolean): void {
    if (!wanted) {
      void this.sentinel?.release().catch(() => undefined);
      this.sentinel = null;
      return;
    }
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock
      .request('screen')
      .then((sentinel) => (this.sentinel = sentinel))
      .catch(() => undefined);
  }
}
