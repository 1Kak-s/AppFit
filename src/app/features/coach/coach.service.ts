import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { LIBRARY } from '../../core/data/library.data';
import { daysText, formatKg, variantsOf, WEEK_ORDER } from '../../core/domain/format';
import { newId } from '../../core/domain/ids';
import { customExercise, exerciseFromLibrary } from '../../core/domain/program-factory';
import { ExerciseProposal, ProgramProposal, SwapProposal } from '../../core/models/coach.model';
import { Exercise, Program } from '../../core/models/program.model';
import { AppConfig } from '../../core/services/app-config';
import { CarnetStore } from '../../core/state/carnet.store';
import {
  asRecord,
  sanitizeProgramProposal,
  sanitizeSwapProposal,
  text,
} from '../../core/validation/sanitize';

const HISTORY_SENT = 8;
const TIMEOUT_MS = 50_000;

/** La conversation avec le coach : envoi d'un message, lecture de la réponse, application des propositions. */
@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(CarnetStore);
  private readonly config = inject(AppConfig);

  /** Adresse du backend : celle saisie sur ce téléphone, sinon celle de config.json. */
  readonly url = computed(() => this.store.settings().coachUrl || this.config.coachUrl());
  readonly busy = signal(false);
  readonly error = signal('');
  readonly draft = signal('');
  /** Messages restants aujourd'hui, une fois connu. */
  readonly remaining = signal<number | null>(null);

  async send(message: string): Promise<void> {
    const content = message.trim().slice(0, 1500);
    const state = this.store.state();
    if (!content || this.busy() || !this.url() || !state) return;

    const { context, references } = this.buildContext();
    this.store.pushCoachMessage({ role: 'user', text: content });
    this.draft.set('');
    this.error.set('');
    this.busy.set(true);

    try {
      const body = {
        deviceId: state.deviceId,
        messages: this.store
          .coachMessages()
          .slice(-HISTORY_SENT)
          .map((m) => ({ role: m.role, content: m.text })),
        context,
      };
      const response = asRecord(
        await firstValueFrom(
          this.http.post<unknown>(`${this.url()}/api/coach/chat`, body).pipe(timeout(TIMEOUT_MS)),
        ),
      );
      const reply = text(response?.['reply'], 3000).replace(/\*\*/g, '');
      if (!response || !reply) throw new Error('Réponse vide');

      // La réponse vient d'un serveur : elle est vérifiée comme n'importe quelle donnée extérieure.
      const program = sanitizeProgramProposal(response['program']);
      const swap = program ? null : this.readSwap(response['swap'], references);
      this.store.pushCoachMessage({
        role: 'assistant',
        text: reply,
        ...(program ? { program } : {}),
        ...(swap ? { swap } : {}),
      });
      if (typeof response['remaining'] === 'number') this.remaining.set(response['remaining']);
    } catch (error) {
      // Le message n'est pas parti : on le retire du fil et on le remet dans la zone de saisie.
      this.store.popCoachMessage();
      this.draft.set(content);
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  /** Ajoute le programme proposé dans le message `index`. */
  applyProgram(index: number, activate: boolean): boolean {
    const proposal = this.store.coachMessages()[index]?.program;
    if (!proposal || !this.store.addProgram(programFromProposal(proposal), activate)) return false;
    this.store.markCoachProposalApplied(index, activate ? 'use' : 'keep');
    return true;
  }

  /** Applique le remplacement proposé dans le message `index`. Renvoie false si l'exercice n'existe plus. */
  applySwap(index: number, mode: 'replace' | 'alternative'): boolean {
    const swap = this.store.coachMessages()[index]?.swap;
    const found = swap ? this.store.locateExercise(swap.exerciseId) : null;
    if (!swap || !found) return false;

    const replacement = exerciseFromProposal(swap, found.exercise);
    const { sets: _s, reps: _r, restSeconds: _t, alternatives: _a, ...asVariant } = replacement;
    const done =
      mode === 'replace'
        ? this.store.replaceExercise(swap.exerciseId, replacement)
        : this.store.addAlternative(swap.exerciseId, asVariant);
    if (done) this.store.markCoachProposalApplied(index, mode);
    return done;
  }

  /**
   * Ce que le coach reçoit : le programme actif, la bibliothèque et les 5 dernières séances.
   * Les exercices sont désignés par une référence courte (« e3 ») ; `references` permet de retrouver le vrai.
   */
  private buildContext(): { context: unknown; references: Map<string, string> } {
    const program = this.store.activeProgram()!;
    const references = new Map<string, string>();
    let counter = 0;

    const library: Record<string, { k: string; nom: string }[]> = {};
    const seen = new Set<string>();
    for (const entry of LIBRARY) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      (library[entry.group] ??= []).push({ k: entry.key, nom: entry.name });
    }

    const context = {
      prenom: this.store.userName() || undefined,
      programme: {
        nom: program.name,
        seances: program.sessions.map((session) => ({
          nom: session.name,
          jours: daysText(session.days) || undefined,
          exercices: session.exercises.map((exercise) => {
            const ref = `e${++counter}`;
            references.set(ref, exercise.id);
            const current = this.store.currentVariant(exercise);
            const weight = this.store.weightOf(current);
            const others = variantsOf(exercise)
              .filter((v) => v.id !== current.id)
              .map((v) => v.name);
            return {
              ref,
              nom: current.name,
              muscles: current.muscles || undefined,
              ...(exercise.sets
                ? {
                    series: exercise.sets,
                    reps: exercise.reps,
                    repos: exercise.restSeconds,
                    charge: weight ? `${formatKg(weight)} ${current.unit}` : undefined,
                  }
                : { duree: exercise.reps }),
              alternatives: others.length ? others : undefined,
            };
          }),
        })),
      },
      bibliotheque: library,
      dernieres_seances: this.store
        .history()
        .slice(0, 5)
        .map((log) => ({
          date: log.date.slice(0, 10),
          seance: log.sessionName,
          exercices: log.items.map((item) =>
            item.cardio
              ? { nom: item.name }
              : {
                  nom: item.name,
                  charge: `${formatKg(item.weight ?? 0)} ${item.unit ?? 'kg'}`,
                  series: `${item.setsDone}/${item.setsPlanned}`,
                },
          ),
        })),
    };
    return { context, references };
  }

  private readSwap(value: unknown, references: Map<string, string>): SwapProposal | null {
    const raw = asRecord(value);
    const exerciseId = raw ? references.get(String(raw['exercise'])) : undefined;
    const replaced = exerciseId ? this.store.locateExercise(exerciseId) : null;
    if (!raw || !replaced) return null;
    return sanitizeSwapProposal({
      ...raw,
      exerciseId,
      replacedName: this.store.currentVariant(replaced.exercise).name,
    });
  }
}

function programFromProposal(proposal: ProgramProposal): Program {
  return {
    id: newId(),
    name: proposal.name,
    updatedAt: Date.now(),
    sessions: proposal.sessions.map((session) => ({
      id: newId(),
      name: session.name,
      days: WEEK_ORDER.filter((d) => session.days.includes(d)),
      warmup: '',
      duration: '',
      exercises: session.exercises.map((e) => exerciseFromProposal(e)),
    })),
  };
}

/** `replaced` : l'exercice remplacé, dont on reprend séries, répétitions et repos si le coach n'en dit rien. */
function exerciseFromProposal(
  proposal: ExerciseProposal | SwapProposal,
  replaced?: Exercise,
): Exercise {
  const exercise = proposal.key
    ? exerciseFromLibrary(proposal.key)
    : { ...customExercise(), name: proposal.name, muscles: proposal.muscles ?? '' };
  return {
    ...exercise,
    sets: proposal.sets ?? replaced?.sets ?? exercise.sets,
    reps: proposal.reps ?? replaced?.reps ?? exercise.reps,
    restSeconds: proposal.rest ?? replaced?.restSeconds ?? exercise.restSeconds,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'Impossible de joindre le coach. Vérifie ta connexion et réessaie.';
    const message = text(asRecord(error.error)?.['message'], 300);
    if (message) return message;
  }
  return "Le coach n'a pas pu répondre. Réessaie dans un instant.";
}
