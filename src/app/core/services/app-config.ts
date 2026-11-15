import { Injectable, signal } from '@angular/core';
import { asRecord, sanitizeCoachUrl } from '../validation/sanitize';

/**
 * Réglages lus au démarrage dans `config.json`, à côté de index.html.
 * On peut ainsi changer l'adresse du coach sur le site en ligne sans recompiler l'app.
 */
@Injectable({ providedIn: 'root' })
export class AppConfig {
  /** Adresse du backend du coach pour tout le monde ; vide = coach non branché. */
  readonly coachUrl = signal('');

  async load(): Promise<void> {
    try {
      const response = await fetch('config.json', { cache: 'no-cache' });
      if (!response.ok) return;
      this.coachUrl.set(sanitizeCoachUrl(asRecord(await response.json())?.['coachUrl']));
    } catch {
      // Hors connexion et fichier absent du cache : l'app fonctionne sans le coach.
    }
  }
}
