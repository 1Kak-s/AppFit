import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LIBRARY_BY_KEY } from '../../core/data/library.data';
import { daysText, plural } from '../../core/domain/format';
import { ExerciseProposal, SwapProposal } from '../../core/models/coach.model';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { CoachService } from './coach.service';

const SUGGESTIONS = [
  'Compose-moi un programme',
  'Je veux remplacer un exercice',
  'Mon programme est-il équilibré ?',
] as const;

/** La discussion avec le coach. Ses propositions (programme, remplacement) s'appliquent en un geste. */
@Component({
  selector: 'app-coach-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './coach.page.html',
})
export class CoachPage {
  protected readonly store = inject(CarnetStore);
  protected readonly coach = inject(CoachService);
  private readonly ui = inject(UiFeedback);

  protected readonly suggestions = SUGGESTIONS;
  protected readonly daysText = daysText;
  protected readonly remainingText = computed(() => {
    const left = this.coach.remaining();
    return left === null ? '' : `Il te reste ${plural(left, 'message')} aujourd'hui. `;
  });
  /** Sur ordinateur, Entrée envoie ; sur téléphone, Entrée passe à la ligne et on envoie avec le bouton. */
  private readonly desktop = matchMedia('(hover:hover) and (pointer:fine)').matches;

  constructor() {
    // À chaque nouveau message (ou erreur), on descend en bas du fil.
    effect(() => {
      this.store.coachMessages();
      this.coach.busy();
      this.coach.error();
      setTimeout(() => window.scrollTo(0, document.documentElement.scrollHeight));
    });
  }

  /** Nom affiché : celui de la bibliothèque si l'exercice en vient, sinon celui donné par le coach. */
  protected nameOf(proposal: ExerciseProposal | SwapProposal): string {
    return (proposal.key ? LIBRARY_BY_KEY.get(proposal.key)?.name : null) ?? proposal.name;
  }

  protected dose(proposal: ExerciseProposal | SwapProposal): string {
    return proposal.sets ? `${proposal.sets} × ${proposal.reps ?? '10-12'}` : (proposal.reps ?? '');
  }

  protected onEnter(event: Event, field: HTMLTextAreaElement): void {
    const key = event as KeyboardEvent;
    if (!this.desktop || key.shiftKey || key.isComposing) return;
    key.preventDefault();
    void this.coach.send(field.value);
  }

  protected resize(field: HTMLTextAreaElement): void {
    this.coach.draft.set(field.value);
    field.style.height = 'auto';
    field.style.height = `${Math.min(132, field.scrollHeight + 2)}px`;
  }

  protected applyProgram(index: number, activate: boolean): void {
    this.ui.toast(
      this.coach.applyProgram(index, activate)
        ? activate
          ? 'Programme ajouté et activé'
          : 'Programme ajouté'
        : 'Trop de programmes : supprimes-en un avant.',
    );
  }

  protected applySwap(index: number, mode: 'replace' | 'alternative'): void {
    const done = this.coach.applySwap(index, mode);
    this.ui.toast(
      done
        ? mode === 'replace'
          ? 'Exercice remplacé'
          : 'Alternative ajoutée'
        : "Cet exercice n'est plus dans ton programme",
    );
  }

  protected async clear(): Promise<void> {
    if (
      await this.ui.confirm(
        'Effacer toute la conversation avec le coach ? Les programmes déjà ajoutés sont gardés.',
        'Effacer',
        true,
      )
    ) {
      this.store.clearCoach();
      this.coach.error.set('');
    }
  }
}
