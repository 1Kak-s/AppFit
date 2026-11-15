import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DAYS, WEEK_ORDER } from '../../core/domain/format';
import { AppConfig } from '../../core/services/app-config';
import { BackupService } from '../../core/services/backup';
import { RestTimer } from '../../core/services/rest-timer';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { sanitizeCoachUrl } from '../../core/validation/sanitize';
import { RestoreBackup } from './restore-backup';

const RULES = [
  { title: 'Charge', text: 'Finis chaque série en gardant 2 à 3 répétitions en réserve.' },
  {
    title: 'Progression',
    text: "Quand tu fais le haut de la fourchette sur toutes les séries, monte d'une plaque la fois suivante. Les boutons + et − changent la charge de 2,5 kg (1 kg pour les haltères).",
  },
  {
    title: 'Tes photos',
    text: 'Touche « Photos » sur une carte pour prendre la machine en photo ou la voir sur le web. Tes photos restent sur ce téléphone.',
  },
  {
    title: 'Machine prise ou cassée',
    text: 'Glisse la carte vers la gauche, ou touche « Alt 1 » / « Alt 2 ». Ton choix est gardé et la charge est suivie séparément.',
  },
  {
    title: 'Réglages',
    text: "Aligne l'axe de la machine avec ton articulation (genou, épaule, coude).",
  },
  {
    title: 'Récupération',
    text: "1,6 à 2 g de protéines par kg, 1,5 à 2 L d'eau, 7 à 9 h de sommeil.",
  },
] as const;

/** Prénom, options pendant la séance, coach, sauvegarde, et quelques repères d'entraînement. */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestoreBackup],
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  protected readonly store = inject(CarnetStore);
  protected readonly config = inject(AppConfig);
  protected readonly backups = inject(BackupService);
  private readonly timer = inject(RestTimer);
  private readonly ui = inject(UiFeedback);

  protected readonly rules = RULES;
  protected readonly restoring = signal(false);
  protected readonly coachUrlError = signal(false);

  /** Les jours de la semaine qui ont au moins une séance. */
  protected readonly week = computed(() =>
    WEEK_ORDER.map((day) => ({
      day,
      sessions: this.store.sessions().filter((s) => s.days.includes(day)),
    }))
      .filter((entry) => entry.sessions.length > 0)
      .map((entry) => ({
        label: DAYS[entry.day].toUpperCase(),
        color: this.store.colorOf(entry.sessions[0]!.id),
        names: entry.sessions.map((s) => s.name).join(' + '),
      })),
  );

  protected testBeep(): void {
    this.timer.testLockScreen();
    this.ui.toast('Verrouille ton téléphone pour voir');
  }

  /** N'enregistre l'adresse que si elle est valide (HTTPS, ou serveur local pour les tests). */
  protected setCoachUrl(value: string): void {
    const typed = value.trim();
    const url = sanitizeCoachUrl(typed);
    this.coachUrlError.set(typed !== '' && url === '');
    if (typed === '' || url !== '') this.store.updateSettings({ coachUrl: url });
  }
}
