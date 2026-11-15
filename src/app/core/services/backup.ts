import { inject, Injectable } from '@angular/core';
import { stateFromLegacyV2 } from '../legacy/legacy-v2.mapper';
import { CarnetState, Photo } from '../models/state.model';
import { CarnetStore } from '../state/carnet.store';
import { asRecord, sanitizePhotos, sanitizeState, text } from '../validation/sanitize';
import { PhotoStore } from './photo-store';

export interface Backup {
  date: string;
  state: CarnetState;
  photos: Record<string, Photo>;
}

const MAX_BACKUP_CHARS = 150_000_000;

/** Export et import de toutes les données du téléphone dans un fichier JSON. */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly store = inject(CarnetStore);
  private readonly photos = inject(PhotoStore);

  /** Propose le fichier par la feuille de partage du téléphone, sinon le télécharge. */
  async export(): Promise<void> {
    const state = this.store.state();
    if (!state) return;
    // La conversation avec le coach et l'identifiant de l'appareil restent sur ce téléphone.
    const portable = { ...state, coach: { messages: [] }, deviceId: '' };
    const data = JSON.stringify({
      t: 'carnet-backup',
      v: 3,
      date: new Date().toISOString(),
      state: portable,
      photos: this.photos.photos(),
    });
    const owner = state.userName
      ? state.userName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-'
      : '';
    const name = `carnet-${owner}${new Date().toISOString().slice(0, 10)}.json`;

    try {
      const file = new File([data], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Sauvegarde Carnet' });
        return;
      }
    } catch {
      return; // Partage annulé par la personne.
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /** Lit et vérifie une sauvegarde (format actuel ou Carnet v2). Renvoie null si ce n'en est pas une. */
  parse(content: string): Backup | null {
    if (content.length > MAX_BACKUP_CHARS) return null;
    let raw: Record<string, unknown> | null;
    try {
      raw = asRecord(JSON.parse(content));
    } catch {
      return null;
    }
    if (!raw || raw['t'] !== 'carnet-backup') return null;

    const legacy = asRecord(raw['st']);
    const state = sanitizeState(legacy ? stateFromLegacyV2(legacy) : raw['state']);
    if (!state) return null;
    return { date: text(raw['date'], 40), state, photos: sanitizePhotos(raw['photos']) };
  }

  async restore(backup: Backup): Promise<void> {
    // On garde l'identifiant de ce téléphone : il sert au plafond de messages du coach.
    const deviceId = this.store.state()?.deviceId ?? backup.state.deviceId;
    this.store.restore({ ...backup.state, deviceId });
    await this.photos.replaceAll(backup.photos);
  }
}
