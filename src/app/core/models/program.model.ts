export const WEIGHT_UNITS = ['kg', 'kg/main', 'kg/côté', 'kg aide'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/**
 * Une façon de faire un exercice : la machine prévue, ou l'une de ses alternatives.
 * La charge et l'historique sont suivis par variante, grâce à son identifiant.
 */
export interface ExerciseVariant {
  id: string;
  name: string;
  /** Nom écrit sur la machine, ex. « LEG PRESS ». */
  machineLabel: string;
  muscles: string;
  /** Charge proposée tant que la personne n'a pas saisi la sienne. */
  startWeight: number;
  unit: WeightUnit;
  /** Recherche YouTube déjà encodée ; vide = construite à partir du nom. */
  videoQuery: string;
  /** Recherche d'images pour reconnaître la machine ; vide = construite à partir du nom. */
  photoQuery: string;
  /** Clé du schéma dans ILLUSTRATIONS. */
  illustration: string;
}

export interface Exercise extends ExerciseVariant {
  /** 0 = cardio : pas de séries, la durée est dans `reps`. */
  sets: number;
  reps: string;
  restSeconds: number;
  alternatives: ExerciseVariant[];
}

export interface Session {
  id: string;
  name: string;
  /** Jours de la semaine, 0 = dimanche (comme Date.getDay()). */
  days: number[];
  warmup: string;
  duration: string;
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  updatedAt: number;
  sessions: Session[];
}
