import { computed, inject, Injectable, signal } from '@angular/core';
import { CarnetStore } from '../state/carnet.store';
import { LockScreenAudio } from './lock-screen-audio';

/** Le minuteur de repos entre deux séries, affiché au-dessus des onglets. */
@Injectable({ providedIn: 'root' })
export class RestTimer {
  private readonly store = inject(CarnetStore);
  private readonly lockScreen = inject(LockScreenAudio);

  private endsAt = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private buzzed = false;
  private label = '';
  private next = '';

  private readonly _active = signal(false);
  private readonly _secondsLeft = signal(0);

  readonly active = this._active.asReadonly();
  readonly secondsLeft = this._secondsLeft.asReadonly();
  readonly finished = computed(() => this._active() && this._secondsLeft() === 0);
  readonly clock = computed(
    () =>
      `${Math.floor(this._secondsLeft() / 60)}:${String(this._secondsLeft() % 60).padStart(2, '0')}`,
  );
  readonly caption = computed(() =>
    this.finished()
      ? 'Repos terminé, série suivante !'
      : `Repos · ${this.label}${this.next ? ' · ' + this.next : ''}`,
  );

  constructor() {
    // Au retour sur l'app, on recalcule tout de suite : les minuteries sont ralenties en arrière-plan.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this._active()) this.tick();
    });
  }

  start(seconds: number, label: string, next = ''): void {
    this.label = label;
    this.next = next;
    this.endsAt = Date.now() + seconds * 1000;
    this.run();
  }

  addFifteenSeconds(): void {
    this.endsAt = Math.max(this.endsAt, Date.now()) + 15_000;
    this.run();
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this._active.set(false);
    this.lockScreen.stop();
  }

  /** Bouton « Tester le bip » des réglages. */
  testLockScreen(): void {
    this.lockScreen.play(5, 'Repos · Test', 'Bip dans 5 secondes', () => this.lockScreen.stop());
  }

  private run(): void {
    this.buzzed = false;
    this._active.set(true);
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 250);
    this.tick();
    if (this.store.settings().lockScreenTimer) {
      this.lockScreen.play(
        (this.endsAt - Date.now()) / 1000,
        `Repos · ${this.label}`,
        this.next || 'Bip à la fin',
        () => this.stop(),
      );
    }
  }

  private tick(): void {
    const left = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
    this._secondsLeft.set(left);
    if (left === 0 && !this.buzzed) {
      this.buzzed = true;
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // Vibration non disponible.
      }
    }
  }
}
