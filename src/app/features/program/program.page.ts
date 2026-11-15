import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { daysText, plural, SESSION_COLORS } from '../../core/domain/format';
import { Program } from '../../core/models/program.model';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { ImportProgram } from './import-program';
import { ProgramWizard } from './program-wizard';
import { ShareSheet } from './share-sheet';

/** Le programme actif (nom, séances) et la liste de tous les programmes. */
@Component({
  selector: 'app-program-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProgramWizard, ImportProgram, ShareSheet],
  templateUrl: './program.page.html',
})
export class ProgramPage {
  protected readonly store = inject(CarnetStore);
  private readonly ui = inject(UiFeedback);

  protected readonly sheet = signal<'wizard' | 'import' | 'share' | null>(null);
  protected readonly colors = SESSION_COLORS;
  protected readonly daysText = daysText;
  protected readonly plural = plural;

  protected addSession(): void {
    if (!this.store.addSession()) this.ui.toast('Nombre maximal de séances atteint');
  }

  protected activate(program: Program): void {
    this.store.activateProgram(program.id);
    this.ui.toast('Programme activé');
  }

  protected async remove(program: Program): Promise<void> {
    if (
      await this.ui.confirm(
        `Supprimer le programme « ${program.name} » ? Ton historique est gardé.`,
        'Supprimer',
        true,
      )
    ) {
      this.store.deleteProgram(program.id);
    }
  }
}
