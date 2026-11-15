import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { shortDate } from '../../core/domain/format';
import { BackupService } from '../../core/services/backup';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { Sheet } from '../../shared/sheet';

/** Restauration d'une sauvegarde, depuis un fichier ou un texte collé. */
@Component({
  selector: 'app-restore-backup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet],
  template: `
    <app-sheet (closed)="closed.emit()">
      <h4>Importer une sauvegarde</h4>
      <label class="opt" for="backup-file" style="justify-content:center"
        >Choisir le fichier .json</label
      >
      <input
        id="backup-file"
        #file
        type="file"
        accept=".json,application/json,text/plain"
        hidden
        (change)="fromFile(file)"
      />
      <p class="note" style="margin:0">ou colle le texte de la sauvegarde :</p>
      <textarea #pasted class="paste" aria-label="Texte de la sauvegarde"></textarea>
      @if (error()) {
        <p class="err">{{ error() }}</p>
      }
      <button
        type="button"
        class="opt"
        style="justify-content:center"
        (click)="restore(pasted.value)"
      >
        Restaurer
      </button>
      <button type="button" class="cancel" (click)="closed.emit()">Annuler</button>
    </app-sheet>
  `,
})
export class RestoreBackup {
  private readonly store = inject(CarnetStore);
  private readonly backups = inject(BackupService);
  private readonly ui = inject(UiFeedback);
  private readonly router = inject(Router);

  readonly closed = output<void>();
  protected readonly error = signal('');

  protected async fromFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (file) await this.restore(await file.text());
  }

  protected async restore(content: string): Promise<void> {
    const backup = this.backups.parse(content);
    if (!backup) {
      this.error.set("Ce n'est pas une sauvegarde du carnet.");
      return;
    }
    if (this.store.hasProfile()) {
      const when = backup.date ? ` du ${shortDate(backup.date)}` : '';
      const confirmed = await this.ui.confirm(
        `Remplacer tout ce qui est sur ce téléphone (programmes, historique, photos) par cette sauvegarde${when} ?`,
        'Remplacer',
        true,
      );
      if (!confirmed) return;
    }
    await this.backups.restore(backup);
    this.closed.emit();
    void this.router.navigate(['/seance']);
    this.ui.toast('Sauvegarde restaurée');
  }
}
