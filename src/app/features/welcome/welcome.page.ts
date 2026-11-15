import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ImportProgram } from '../program/import-program';
import { ProgramWizard } from '../program/program-wizard';
import { RestoreBackup } from '../settings/restore-backup';

/** Premier lancement : créer un programme, en importer un, ou restaurer une sauvegarde. */
@Component({
  selector: 'app-welcome-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgramWizard, ImportProgram, RestoreBackup],
  templateUrl: './welcome.page.html',
})
export class WelcomePage {
  protected readonly userName = signal('');
  protected readonly sheet = signal<'wizard' | 'import' | 'restore' | null>(null);

  protected readonly choices = [
    {
      sheet: 'wizard',
      icon: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12',
      title: 'Créer mon programme',
      detail: "De 1 à 7 jours par semaine, prêt à l'emploi ou à remplir toi-même",
    },
    {
      sheet: 'import',
      icon: 'M12 4v11M7 10l5 5 5-5M5 20h14',
      title: "J'ai reçu un programme",
      detail: "Colle le lien ou le code qu'on t'a envoyé",
    },
    {
      sheet: 'restore',
      icon: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
      title: 'Restaurer une sauvegarde',
      detail: "Fichier ou texte exporté depuis l'app",
    },
  ] as const;
}
