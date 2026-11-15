import { CoachMessage } from './coach.model';
import { Program, WeightUnit } from './program.model';

export interface LoggedItem {
  exerciseId: string;
  variantId: string;
  name: string;
  cardio: boolean;
  unit?: WeightUnit;
  setsDone?: number;
  setsPlanned?: number;
  weight?: number;
}

/** Une séance terminée. */
export interface WorkoutLog {
  id: string;
  date: string;
  programId: string;
  sessionId: string;
  sessionName: string;
  items: LoggedItem[];
}

/** Avancement d'un exercice dans la séance en cours. */
export interface ExerciseProgress {
  /** Séries cochées (ou 1 pour un cardio fait). */
  done: number;
  /** Séries bonus ajoutées pour cette séance. */
  extra: number;
}

export interface Settings {
  keepAwake: boolean;
  lockScreenTimer: boolean;
  /** Adresse du backend du coach saisie sur ce téléphone ; vide = celle de config.json. */
  coachUrl: string;
}

/** Tout ce que l'app garde sur le téléphone. */
export interface CarnetState {
  version: 3;
  userName: string;
  /** Identifiant aléatoire de ce téléphone, utilisé pour le plafond de messages du coach. */
  deviceId: string;
  programs: Program[];
  activeProgramId: string;
  /** Séance en cours : avancement par séance puis par exercice. */
  progress: Record<string, Record<string, ExerciseProgress>>;
  /** Charge actuelle par variante. */
  weights: Record<string, number>;
  /** Variante choisie par exercice, quand ce n'est pas la machine prévue. */
  selectedVariant: Record<string, string>;
  history: WorkoutLog[];
  settings: Settings;
  coach: { messages: CoachMessage[] };
  /** Migration v1 : les photos d'origine restent à copier dans les photos perso. */
  pendingSeedPhotos: boolean;
}

/** Photo perso d'une machine, stockée dans IndexedDB. */
export interface Photo {
  src: string;
  position: string;
}
