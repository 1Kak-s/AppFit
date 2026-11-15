import { inject, Injectable, signal } from '@angular/core';
import { Photo } from '../models/state.model';
import { CarnetStore } from '../state/carnet.store';
import { sanitizePhoto, sanitizePhotos } from '../validation/sanitize';

const DB_NAME = 'onair-photos';
const STORE = 'p';
const MAX_SIDE = 900;

/**
 * Photos perso des machines. Elles vont dans IndexedDB (trop lourdes pour le stockage classique)
 * et ne quittent jamais le téléphone, sauf dans une sauvegarde que la personne exporte elle-même.
 */
@Injectable({ providedIn: 'root' })
export class PhotoStore {
  private readonly store = inject(CarnetStore);
  private readonly _photos = signal<Record<string, Photo>>({});
  private db: IDBDatabase | null = null;

  readonly photos = this._photos.asReadonly();

  async init(): Promise<void> {
    this.db = await this.open();
    const stored = await this.readAll();
    this._photos.set(sanitizePhotos(stored));
    await this.copySeedPhotos();
  }

  photoOf(variantId: string): Photo | null {
    return this._photos()[variantId] ?? null;
  }

  /** Renvoie false si la photo est affichée mais n'a pas pu être enregistrée durablement. */
  async set(variantId: string, photo: Photo): Promise<boolean> {
    this._photos.update((all) => ({ ...all, [variantId]: photo }));
    return this.write((store) => store.put(photo, variantId));
  }

  async remove(variantId: string): Promise<void> {
    this._photos.update(({ [variantId]: _removed, ...rest }) => rest);
    await this.write((store) => store.delete(variantId));
  }

  /** Remplace toutes les photos (restauration d'une sauvegarde déjà vérifiée). */
  async replaceAll(photos: Record<string, Photo>): Promise<void> {
    this._photos.set(photos);
    await this.write((store) => store.clear());
    for (const [id, photo] of Object.entries(photos))
      await this.write((store) => store.put(photo, id));
  }

  /**
   * Réduit la photo et la réencode en JPEG. Le passage par un canvas retire au passage
   * les métadonnées du fichier d'origine (lieu, appareil, date).
   */
  async fromFile(file: File): Promise<Photo> {
    if (!file.type.startsWith('image/')) throw new Error("Ce fichier n'est pas une image");
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const photo = sanitizePhoto(canvas.toDataURL('image/jpeg', 0.75));
    if (!photo) throw new Error('Image illisible');
    return photo;
  }

  /** Migration v1 : les photos fournies avec l'ancienne app deviennent des photos perso. */
  private async copySeedPhotos(): Promise<void> {
    if (!this.store.state()?.pendingSeedPhotos) return;
    try {
      const response = await fetch('seed-photos.json');
      if (!response.ok) return;
      const seed = sanitizePhotos(await response.json());
      for (const [id, photo] of Object.entries(seed)) {
        if (!this._photos()[id]) await this.set(id, photo);
      }
      this.store.seedPhotosDone();
    } catch {
      // Hors connexion : on réessaiera à la prochaine ouverture.
    }
  }

  private open(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private readAll(): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      const out: Record<string, unknown> = {};
      if (!this.db) return resolve(out);
      try {
        const cursor = this.db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return resolve(out);
          out[String(entry.key)] = entry.value;
          entry.continue();
        };
        cursor.onerror = () => resolve(out);
      } catch {
        resolve(out);
      }
    });
  }

  private write(action: (store: IDBObjectStore) => void): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(false);
      try {
        const tx = this.db.transaction(STORE, 'readwrite');
        action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(true);
        tx.onerror = tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }
}
