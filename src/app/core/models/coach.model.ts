/** Formes échangées avec le backend du coach (voir carnet-coach-api). */

export interface ExerciseProposal {
  key: string | null;
  name: string;
  muscles: string | null;
  sets: number;
  reps: string;
  rest: number;
}

export interface SessionProposal {
  name: string;
  days: number[];
  exercises: ExerciseProposal[];
}

export interface ProgramProposal {
  name: string;
  sessions: SessionProposal[];
}

export interface SwapProposal {
  /** Identifiant de l'exercice du carnet à remplacer. */
  exerciseId: string;
  /** Nom de l'exercice remplacé, au moment de la proposition. */
  replacedName: string;
  key: string | null;
  name: string;
  muscles: string | null;
  sets: number | null;
  reps: string | null;
  rest: number | null;
}

export type AppliedAction = 'use' | 'keep' | 'replace' | 'alternative';

export interface CoachMessage {
  role: 'user' | 'assistant';
  text: string;
  program?: ProgramProposal;
  swap?: SwapProposal;
  /** Renseigné une fois la proposition acceptée. */
  applied?: AppliedAction;
}
