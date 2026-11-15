import { Injectable } from '@angular/core';
import { hasLegacyV1Data, stateFromLegacyV1 } from '../legacy/legacy-v1.mapper';
import { stateFromLegacyV2 } from '../legacy/legacy-v2.mapper';
import { CarnetState } from '../models/state.model';
import { sanitizeState } from '../validation/sanitize';

const KEY = 'carnet-v3';
const KEY_V2 = 'carnet-v2';
const KEY_V1 = 'onair-carnet-v1';

/**
 * Lecture et écriture de l'état dans le stockage du téléphone.
 * Les anciens formats sont convertis à la première ouverture ; leurs données d'origine ne sont pas effacées.
 */
@Injectable({ providedIn: 'root' })
export class StateStorage {
  load(): CarnetState | null {
    const current = this.read(KEY);
    if (current) return sanitizeState(current);

    const v2 = this.read(KEY_V2);
    if (v2) return this.migrated(sanitizeState(stateFromLegacyV2(v2)));

    const v1 = this.read(KEY_V1);
    if (hasLegacyV1Data(v1)) return this.migrated(sanitizeState(stateFromLegacyV1(v1)));

    return null;
  }

  /** Renvoie false si le navigateur refuse l'écriture (stockage plein ou navigation privée). */
  save(state: CarnetState): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  private migrated(state: CarnetState | null): CarnetState | null {
    if (state) this.save(state);
    return state;
  }

  private read(key: string): Record<string, unknown> | null {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      return typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}
