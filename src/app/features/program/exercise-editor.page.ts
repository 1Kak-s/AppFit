import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { REST_CHOICES, restText } from '../../core/domain/format';
import { customVariant, variantFromLibrary } from '../../core/domain/program-factory';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { LibraryPicker } from './library-picker';
import { VariantFields } from './variant-fields';

/** Édition d'un exercice : description, séries, repos, et ses alternatives. */
@Component({
  selector: 'app-exercise-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VariantFields, LibraryPicker],
  templateUrl: './exercise-editor.page.html',
})
export class ExerciseEditorPage {
  protected readonly store = inject(CarnetStore);
  private readonly ui = inject(UiFeedback);
  private readonly router = inject(Router);

  /** Paramètres de route. */
  readonly sessionId = input.required<string>();
  readonly exerciseId = input.required<string>();

  protected readonly session = computed(() => this.store.session(this.sessionId()));
  protected readonly exercise = computed(
    () => this.session()?.exercises.find((e) => e.id === this.exerciseId()) ?? null,
  );
  protected readonly color = computed(() => this.store.colorOf(this.sessionId()));
  protected readonly pickingFromLibrary = signal(false);

  protected readonly rests = REST_CHOICES.map((seconds) => ({ seconds, label: restText(seconds) }));

  /** Musculation (séries et répétitions) ou cardio (une durée). */
  protected setStrength(strength: boolean): void {
    const exercise = this.exercise()!;
    if (strength && !exercise.sets) {
      this.store.updateExercise(exercise.id, {
        sets: 3,
        reps: '10-12',
        restSeconds: exercise.restSeconds || 90,
      });
    } else if (!strength && exercise.sets) {
      this.store.updateExercise(exercise.id, {
        sets: 0,
        reps: /min/.test(exercise.reps) ? exercise.reps : '10 min',
      });
    }
  }

  protected setSets(value: number): void {
    if (Number.isFinite(value))
      this.store.updateExercise(this.exerciseId(), {
        sets: Math.min(8, Math.max(1, Math.round(value))),
      });
  }

  protected addAlternativeFromLibrary(key: string): void {
    this.pickingFromLibrary.set(false);
    this.addAlternative(variantFromLibrary(key), false);
  }

  protected addCustomAlternative(): void {
    this.addAlternative(customVariant('Alternative'), true);
  }

  protected async remove(): Promise<void> {
    if (
      await this.ui.confirm(
        `Supprimer l'exercice « ${this.exercise()!.name} » ?`,
        'Supprimer',
        true,
      )
    ) {
      this.store.deleteExercise(this.exerciseId());
      void this.router.navigate(['/programme/seance', this.sessionId()]);
    }
  }

  private addAlternative(alternative: ReturnType<typeof customVariant>, edit: boolean): void {
    if (!this.store.addAlternative(this.exerciseId(), alternative)) {
      this.ui.toast("Nombre maximal d'alternatives atteint");
    } else if (edit) {
      void this.router.navigate([
        '/programme/seance',
        this.sessionId(),
        'exercice',
        this.exerciseId(),
        'alternative',
        alternative.id,
      ]);
    } else {
      this.ui.toast(`${alternative.name} ajouté`);
    }
  }
}
