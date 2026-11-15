import { computed, inject, Injectable, signal } from '@angular/core';
import { SESSION_COLORS, variantsOf, WEEK_ORDER } from '../domain/format';
import { newId } from '../domain/ids';
import { emptySession } from '../domain/program-factory';
import { AppliedAction, CoachMessage } from '../models/coach.model';
import { Exercise, ExerciseVariant, Program, Session } from '../models/program.model';
import {
  CarnetState,
  ExerciseProgress,
  LoggedItem,
  Settings,
  WorkoutLog,
} from '../models/state.model';
import { LIMITS } from '../validation/sanitize';
import { StateStorage } from './state-storage';

const NO_PROGRESS: ExerciseProgress = { done: 0, extra: 0 };

export interface SetToggle {
  done: number;
  total: number;
  /** Vrai si une série vient d'être cochée (et non décochée). */
  increased: boolean;
}

/**
 * La source de vérité de l'app. L'état est un signal en lecture seule : les écrans le lisent,
 * et toute modification passe par une méthode d'ici, qui l'enregistre aussitôt sur le téléphone.
 */
@Injectable({ providedIn: 'root' })
export class CarnetStore {
  private readonly storage = inject(StateStorage);
  private readonly _state = signal<CarnetState | null>(this.storage.load());

  readonly state = this._state.asReadonly();
  readonly hasProfile = computed(() => this._state() !== null);

  readonly userName = computed(() => this._state()?.userName ?? '');
  readonly programs = computed(() => this._state()?.programs ?? []);
  readonly history = computed(() => this._state()?.history ?? []);
  readonly settings = computed<Settings>(
    () => this._state()?.settings ?? { keepAwake: true, lockScreenTimer: false, coachUrl: '' },
  );
  readonly coachMessages = computed(() => this._state()?.coach.messages ?? []);
  readonly activeProgram = computed<Program | null>(() => {
    const state = this._state();
    return state
      ? (state.programs.find((p) => p.id === state.activeProgramId) ?? state.programs[0] ?? null)
      : null;
  });
  readonly sessions = computed(() => this.activeProgram()?.sessions ?? []);
  /** Séance prévue aujourd'hui dans le programme actif, s'il y en a une. */
  readonly todaySession = computed(() => {
    const today = new Date().getDay();
    return this.sessions().find((s) => s.days.includes(today)) ?? null;
  });

  // ---------- lecture ----------

  session(id: string | null): Session | null {
    return this.sessions().find((s) => s.id === id) ?? null;
  }

  /** Cherche un exercice du programme actif, avec la séance qui le contient. */
  locateExercise(exerciseId: string): { session: Session; exercise: Exercise } | null {
    for (const session of this.sessions()) {
      const exercise = session.exercises.find((e) => e.id === exerciseId);
      if (exercise) return { session, exercise };
    }
    return null;
  }

  /** Cherche une variante (machine ou alternative) dans tous les programmes. */
  findVariant(variantId: string): ExerciseVariant | null {
    for (const program of this.programs()) {
      for (const session of program.sessions) {
        for (const exercise of session.exercises) {
          const variant = variantsOf(exercise).find((v) => v.id === variantId);
          if (variant) return variant;
        }
      }
    }
    return null;
  }

  colorOf(sessionId: string, program: Program | null = this.activeProgram()): string {
    const index = program?.sessions.findIndex((s) => s.id === sessionId) ?? -1;
    return index < 0 ? 'var(--muted)' : SESSION_COLORS[index % SESSION_COLORS.length]!;
  }

  progressOf(sessionId: string, exerciseId: string): ExerciseProgress {
    return this._state()?.progress[sessionId]?.[exerciseId] ?? NO_PROGRESS;
  }

  weightOf(variant: ExerciseVariant): number {
    return this._state()?.weights[variant.id] ?? variant.startWeight;
  }

  /** La variante affichée pour cet exercice : celle choisie la dernière fois, sinon la machine prévue. */
  currentVariant(exercise: Exercise): ExerciseVariant {
    const chosen = this._state()?.selectedVariant[exercise.id];
    return variantsOf(exercise).find((v) => v.id === chosen) ?? exercise;
  }

  /** Dernière charge enregistrée pour une variante. */
  lastLog(variantId: string): { weight: number; date: string } | null {
    for (const log of this.history()) {
      const item = log.items.find((i) => i.variantId === variantId && i.weight != null);
      if (item) return { weight: item.weight!, date: log.date };
    }
    return null;
  }

  // ---------- profil et programmes ----------

  createProfile(userName: string, program: Program): void {
    const state: CarnetState = {
      version: 3,
      userName,
      deviceId: newId(),
      programs: [program],
      activeProgramId: program.id,
      progress: {},
      weights: {},
      selectedVariant: {},
      history: [],
      settings: { keepAwake: true, lockScreenTimer: false, coachUrl: '' },
      coach: { messages: [] },
      pendingSeedPhotos: false,
    };
    this.commit(state);
  }

  /** Remplace tout l'état, après restauration d'une sauvegarde déjà vérifiée. */
  restore(state: CarnetState): void {
    this.commit({ ...state, pendingSeedPhotos: false });
  }

  setUserName(userName: string): void {
    this.mutate((draft) => (draft.userName = userName));
  }

  updateSettings(patch: Partial<Settings>): void {
    this.mutate((draft) => Object.assign(draft.settings, patch));
  }

  seedPhotosDone(): void {
    this.mutate((draft) => (draft.pendingSeedPhotos = false));
  }

  addProgram(program: Program, activate: boolean): boolean {
    if (this.programs().length >= LIMITS.programs) return false;
    this.mutate((draft) => {
      draft.programs.push(program);
      if (activate) draft.activeProgramId = program.id;
    });
    return true;
  }

  activateProgram(programId: string): void {
    this.mutate((draft) => {
      if (draft.programs.some((p) => p.id === programId)) draft.activeProgramId = programId;
    });
  }

  deleteProgram(programId: string): void {
    this.mutate((draft) => {
      if (draft.programs.length < 2) return;
      draft.programs = draft.programs.filter((p) => p.id !== programId);
      if (draft.activeProgramId === programId) draft.activeProgramId = draft.programs[0]!.id;
    });
  }

  renameProgram(name: string): void {
    this.editProgram((program) => (program.name = name));
  }

  // ---------- séances du programme actif ----------

  addSession(): string | null {
    if (this.sessions().length >= LIMITS.sessions) return null;
    const session = emptySession(`Séance ${this.sessions().length + 1}`);
    this.editProgram((program) => program.sessions.push(session));
    return session.id;
  }

  updateSession(
    sessionId: string,
    patch: Partial<Pick<Session, 'name' | 'duration' | 'warmup'>>,
  ): void {
    this.editSession(sessionId, (session) => Object.assign(session, patch));
  }

  toggleSessionDay(sessionId: string, day: number): void {
    this.editSession(sessionId, (session) => {
      const days = session.days.includes(day)
        ? session.days.filter((d) => d !== day)
        : [...session.days, day];
      session.days = WEEK_ORDER.filter((d) => days.includes(d));
    });
  }

  deleteSession(sessionId: string): void {
    this.editProgram(
      (program) => (program.sessions = program.sessions.filter((s) => s.id !== sessionId)),
    );
  }

  moveSession(sessionId: string, delta: number): void {
    this.editProgram((program) => move(program.sessions, sessionId, delta));
  }

  // ---------- exercices ----------

  addExercise(sessionId: string, exercise: Exercise): boolean {
    if ((this.session(sessionId)?.exercises.length ?? 0) >= LIMITS.exercises) return false;
    this.editSession(sessionId, (session) => session.exercises.push(exercise));
    return true;
  }

  updateExercise(exerciseId: string, patch: Partial<Omit<Exercise, 'id' | 'alternatives'>>): void {
    this.editExercise(exerciseId, (exercise) => Object.assign(exercise, patch));
  }

  deleteExercise(exerciseId: string): void {
    this.editProgram((program) => {
      for (const session of program.sessions)
        session.exercises = session.exercises.filter((e) => e.id !== exerciseId);
    });
  }

  moveExercise(sessionId: string, exerciseId: string, delta: number): void {
    this.editSession(sessionId, (session) => move(session.exercises, exerciseId, delta));
  }

  /**
   * Met `replacement` à la place de l'exercice. L'ancien devient sa première alternative :
   * ses charges et son historique restent accessibles en glissant la carte.
   */
  replaceExercise(exerciseId: string, replacement: Exercise): boolean {
    if (!this.locateExercise(exerciseId)) return false;
    this.mutate((draft) => {
      for (const session of activeProgramOf(draft).sessions) {
        const index = session.exercises.findIndex((e) => e.id === exerciseId);
        if (index < 0) continue;
        const {
          sets: _s,
          reps: _r,
          restSeconds: _t,
          alternatives: _a,
          ...previous
        } = session.exercises[index]!;
        const others = replacement.alternatives.filter((a) => a.name !== previous.name);
        session.exercises[index] = {
          ...replacement,
          alternatives: [previous, ...others].slice(0, LIMITS.alternatives),
        };
        delete draft.selectedVariant[exerciseId];
      }
      activeProgramOf(draft).updatedAt = Date.now();
    });
    return true;
  }

  addAlternative(exerciseId: string, alternative: ExerciseVariant): boolean {
    const found = this.locateExercise(exerciseId);
    if (!found || found.exercise.alternatives.length >= LIMITS.alternatives) return false;
    this.editExercise(exerciseId, (exercise) => exercise.alternatives.push(alternative));
    return true;
  }

  updateAlternative(
    exerciseId: string,
    alternativeId: string,
    patch: Partial<Omit<ExerciseVariant, 'id'>>,
  ): void {
    this.editExercise(exerciseId, (exercise) => {
      const alternative = exercise.alternatives.find((a) => a.id === alternativeId);
      if (alternative) Object.assign(alternative, patch);
    });
  }

  deleteAlternative(exerciseId: string, alternativeId: string): void {
    this.mutate((draft) => {
      const program = activeProgramOf(draft);
      for (const session of program.sessions) {
        const exercise = session.exercises.find((e) => e.id === exerciseId);
        if (exercise)
          exercise.alternatives = exercise.alternatives.filter((a) => a.id !== alternativeId);
      }
      if (draft.selectedVariant[exerciseId] === alternativeId)
        delete draft.selectedVariant[exerciseId];
      program.updatedAt = Date.now();
    });
  }

  // ---------- séance en cours ----------

  /** Coche la série `index` ; la toucher à nouveau quand c'est la dernière cochée la décoche. */
  toggleSet(sessionId: string, exercise: Exercise, index: number): SetToggle {
    const before = this.progressOf(sessionId, exercise.id);
    const done = before.done === index + 1 ? index : index + 1;
    this.setProgress(sessionId, exercise.id, { ...before, done });
    return { done, total: exercise.sets + before.extra, increased: done > before.done };
  }

  addExtraSet(sessionId: string, exercise: Exercise): void {
    const before = this.progressOf(sessionId, exercise.id);
    if (exercise.sets + before.extra < 8)
      this.setProgress(sessionId, exercise.id, { ...before, extra: before.extra + 1 });
  }

  removeExtraSet(sessionId: string, exercise: Exercise): void {
    const before = this.progressOf(sessionId, exercise.id);
    const extra = Math.max(0, before.extra - 1);
    this.setProgress(sessionId, exercise.id, {
      done: Math.min(before.done, exercise.sets + extra),
      extra,
    });
  }

  toggleCardio(sessionId: string, exerciseId: string): void {
    const before = this.progressOf(sessionId, exerciseId);
    this.setProgress(sessionId, exerciseId, { done: before.done ? 0 : 1, extra: 0 });
  }

  setWeight(variantId: string, weight: number): void {
    this.mutate((draft) => (draft.weights[variantId] = Math.min(1000, Math.max(0, weight))));
  }

  /** Mémorise la variante affichée (machine prévue ou alternative) pour la prochaine fois. */
  selectVariant(exercise: Exercise, variantId: string): void {
    const current = this._state()?.selectedVariant[exercise.id] ?? exercise.id;
    if (current === variantId) return;
    this.mutate((draft) => {
      if (variantId === exercise.id) delete draft.selectedVariant[exercise.id];
      else draft.selectedVariant[exercise.id] = variantId;
    });
  }

  resetSession(sessionId: string): void {
    this.mutate((draft) => delete draft.progress[sessionId]);
  }

  /** Enregistre la séance dans l'historique et remet les séries à zéro. */
  finishSession(sessionId: string): void {
    const session = this.session(sessionId);
    const program = this.activeProgram();
    if (!session || !program) return;

    const items: LoggedItem[] = [];
    for (const exercise of session.exercises) {
      const progress = this.progressOf(sessionId, exercise.id);
      if (!progress.done) continue;
      const variant = this.currentVariant(exercise);
      const base = { exerciseId: exercise.id, variantId: variant.id, name: variant.name };
      items.push(
        exercise.sets
          ? {
              ...base,
              cardio: false,
              unit: variant.unit,
              setsDone: progress.done,
              setsPlanned: exercise.sets + progress.extra,
              weight: this.weightOf(variant),
            }
          : { ...base, cardio: true },
      );
    }

    const log: WorkoutLog = {
      id: newId(),
      date: new Date().toISOString(),
      programId: program.id,
      sessionId,
      sessionName: session.name,
      items,
    };
    this.mutate((draft) => {
      draft.history = [log, ...draft.history].slice(0, LIMITS.history);
      delete draft.progress[sessionId];
    });
  }

  // ---------- conversation avec le coach ----------

  pushCoachMessage(message: CoachMessage): void {
    this.mutate(
      (draft) =>
        (draft.coach.messages = [...draft.coach.messages, message].slice(-LIMITS.coachMessages)),
    );
  }

  popCoachMessage(): void {
    this.mutate((draft) => draft.coach.messages.pop());
  }

  markCoachProposalApplied(index: number, action: AppliedAction): void {
    this.mutate((draft) => {
      const message = draft.coach.messages[index];
      if (message) message.applied = action;
    });
  }

  clearCoach(): void {
    this.mutate((draft) => (draft.coach.messages = []));
  }

  // ---------- écriture ----------

  private commit(state: CarnetState): void {
    this._state.set(state);
    this.storage.save(state);
  }

  /** Applique une modification sur une copie de l'état, puis la publie et l'enregistre. */
  private mutate(recipe: (draft: CarnetState) => void): void {
    const current = this._state();
    if (!current) return;
    const draft = structuredClone(current);
    recipe(draft);
    this.commit(draft);
  }

  private editProgram(recipe: (program: Program) => void): void {
    this.mutate((draft) => {
      const program = activeProgramOf(draft);
      recipe(program);
      program.updatedAt = Date.now();
    });
  }

  private editSession(sessionId: string, recipe: (session: Session) => void): void {
    this.editProgram((program) => {
      const session = program.sessions.find((s) => s.id === sessionId);
      if (session) recipe(session);
    });
  }

  private editExercise(exerciseId: string, recipe: (exercise: Exercise) => void): void {
    this.editProgram((program) => {
      for (const session of program.sessions) {
        const exercise = session.exercises.find((e) => e.id === exerciseId);
        if (exercise) recipe(exercise);
      }
    });
  }

  private setProgress(sessionId: string, exerciseId: string, progress: ExerciseProgress): void {
    this.mutate((draft) => ((draft.progress[sessionId] ??= {})[exerciseId] = progress));
  }
}

function activeProgramOf(state: CarnetState): Program {
  return state.programs.find((p) => p.id === state.activeProgramId) ?? state.programs[0]!;
}

function move<T extends { id: string }>(list: T[], id: string, delta: number): void {
  const from = list.findIndex((item) => item.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to]!, list[from]!];
}
