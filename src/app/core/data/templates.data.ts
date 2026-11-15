// Fichier généré par tools/generate-data.mjs.
export interface OnAirSession {
  readonly legacyId: string;
  readonly name: string;
  readonly day: number;
  readonly warmup: string;
  readonly duration: string;
  readonly exerciseKeys: readonly string[];
}

export interface ReadyProgram {
  readonly name: string;
  readonly description: string;
  readonly days: readonly (readonly number[])[] | null;
  readonly sessions: readonly { readonly name: string; readonly exerciseKeys: readonly string[] }[];
}

/** Le programme d'origine, « Machines en 3 séances ». */
export const ON_AIR_SESSIONS: readonly OnAirSession[] = [
  {
    legacyId: 'A',
    name: 'Jambes et abdos',
    day: 6,
    warmup: '5 à 10 min sur vélo ou tapis.',
    duration: '50 à 60 min',
    exerciseKeys: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
  },
  {
    legacyId: 'B',
    name: 'Pectoraux et épaules',
    day: 0,
    warmup: '5 à 10 min de vélo, puis 1 série légère sur la Chest Press.',
    duration: '45 à 55 min',
    exerciseKeys: ['b1', 'b2', 'b3', 'b4', 'b5'],
  },
  {
    legacyId: 'C',
    name: 'Dos et bras',
    day: 1,
    warmup: '5 à 10 min de rameur ou vélo.',
    duration: '45 à 55 min',
    exerciseKeys: ['c1', 'c2', 'c3', 'c4', 'c5'],
  },
];

/** Programmes prêts à l'emploi, par nombre de jours d'entraînement par semaine. */
export const READY_PROGRAMS: Readonly<Record<number, ReadyProgram>> = {
  '1': {
    name: 'Full body 1 jour',
    description: 'Une séance complète, tout le corps.',
    days: null,
    sessions: [
      {
        name: 'Full body',
        exerciseKeys: ['a1', 'b1', 'c1', 'b4', 'a2', 'a5'],
      },
    ],
  },
  '2': {
    name: 'Full body 2 jours',
    description: 'Deux séances complètes différentes, tout le corps à chaque fois.',
    days: null,
    sessions: [
      {
        name: 'Full body A',
        exerciseKeys: ['a1', 'b1', 'c1', 'a2', 'b4', 'a5'],
      },
      {
        name: 'Full body B',
        exerciseKeys: ['a3', 'c2', 'b2', 'a4', 'b3', 'a5x1'],
      },
    ],
  },
  '4': {
    name: 'Haut / Bas 4 jours',
    description: 'Haut du corps et jambes en alternance, deux variantes de chaque.',
    days: null,
    sessions: [
      {
        name: 'Haut du corps A',
        exerciseKeys: ['b1', 'c1', 'b4', 'c2', 'c3', 'c4'],
      },
      {
        name: 'Bas du corps A',
        exerciseKeys: ['a1', 'a2', 'a4', 'a5'],
      },
      {
        name: 'Haut du corps B',
        exerciseKeys: ['b1x1', 'c2x2', 'b2', 'b3', 'c3x1', 'c4x1'],
      },
      {
        name: 'Bas du corps B',
        exerciseKeys: ['a3', 'a2x1', 'a4x1', 'a1x2', 'a5x2'],
      },
    ],
  },
  '5': {
    name: '5 jours',
    description: 'Push, Pull, Jambes, puis Haut et Bas aux haltères.',
    days: null,
    sessions: [
      {
        name: 'Push',
        exerciseKeys: ['b1', 'b4', 'b2', 'b3', 'c4'],
      },
      {
        name: 'Pull',
        exerciseKeys: ['c1', 'c2', 'c1x2', 'c3'],
      },
      {
        name: 'Jambes',
        exerciseKeys: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
      {
        name: 'Haut du corps',
        exerciseKeys: ['b1x1', 'c2x1', 'b3x1', 'c3x1', 'c4x2'],
      },
      {
        name: 'Bas du corps',
        exerciseKeys: ['a1x2', 'a2x1', 'a4x1', 'a3x1', 'a5x1'],
      },
    ],
  },
  '6': {
    name: 'Push Pull Jambes 6 jours',
    description: '3 séances faites 2 fois par semaine : chaque muscle travaille 2 fois.',
    days: [
      [1, 4],
      [2, 5],
      [3, 6],
    ],
    sessions: [
      {
        name: 'Push',
        exerciseKeys: ['b1', 'b4', 'b2', 'b3', 'c4'],
      },
      {
        name: 'Pull',
        exerciseKeys: ['c1', 'c2', 'c1x2', 'c3'],
      },
      {
        name: 'Jambes',
        exerciseKeys: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
    ],
  },
};

/** Répartition par défaut des séances dans la semaine (0 = dimanche). */
export const WEEK_SPREAD: Readonly<Record<number, readonly (readonly number[])[]>> = {
  '1': [[3]],
  '2': [[1], [4]],
  '3': [[1], [3], [5]],
  '4': [[1], [2], [4], [5]],
  '5': [[1], [2], [3], [5], [6]],
  '6': [[1], [2], [3], [4], [5], [6]],
  '7': [[1], [2], [3], [4], [5], [6], [0]],
};
