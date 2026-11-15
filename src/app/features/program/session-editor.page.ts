import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DAYS, plural, prescription, SHORT_DAYS, WEEK_ORDER } from '../../core/domain/format';
import { customExercise, exerciseFromLibrary } from '../../core/domain/program-factory';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { LibraryPicker } from './library-picker';

/** Édition d'une séance : nom, jours, échauffement et liste des exercices. */
@Component({
  selector: 'app-session-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LibraryPicker],
  templateUrl: './session-editor.page.html',
})
export class SessionEditorPage {
  protected readonly store = inject(CarnetStore);
  private readonly ui = inject(UiFeedback);
  private readonly router = inject(Router);

  /** Paramètre de route. */
  readonly sessionId = input.required<string>();

  protected readonly session = computed(() => this.store.session(this.sessionId()));
  protected readonly color = computed(() => this.store.colorOf(this.sessionId()));
  protected readonly pickingFromLibrary = signal(false);

  protected readonly week = WEEK_ORDER.map((day) => ({
    day,
    label: DAYS[day],
    initial: SHORT_DAYS[day].slice(0, 1),
  }));
  protected readonly prescription = prescription;
  protected readonly plural = plural;

  protected addFromLibrary(key: string): void {
    this.pickingFromLibrary.set(false);
    const exercise = exerciseFromLibrary(key);
    this.ui.toast(
      this.store.addExercise(this.sessionId(), exercise)
        ? `${exercise.name} ajouté`
        : "Nombre maximal d'exercices atteint",
    );
  }

  protected addCustom(): void {
    const exercise = customExercise();
    if (this.store.addExercise(this.sessionId(), exercise)) {
      void this.router.navigate(['/programme/seance', this.sessionId(), 'exercice', exercise.id]);
    } else {
      this.ui.toast("Nombre maximal d'exercices atteint");
    }
  }

  protected async remove(): Promise<void> {
    const session = this.session()!;
    if (
      await this.ui.confirm(
        `Supprimer la séance « ${session.name} » et ses ${plural(session.exercises.length, 'exercice')} ?`,
        'Supprimer',
        true,
      )
    ) {
      this.store.deleteSession(session.id);
      void this.router.navigate(['/programme']);
    }
  }
}
