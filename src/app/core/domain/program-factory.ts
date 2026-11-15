import { LIBRARY_BY_KEY } from '../data/library.data';
import { ON_AIR_SESSIONS, READY_PROGRAMS, WEEK_SPREAD } from '../data/templates.data';
import { Exercise, ExerciseVariant, Program, Session } from '../models/program.model';
import { newId } from './ids';

/** `keepLegacyIds` reprend les identifiants de la v1 (clé de bibliothèque), pour que l'historique migré s'y rattache. */
export function variantFromLibrary(key: string, keepLegacyIds = false): ExerciseVariant {
  const entry = LIBRARY_BY_KEY.get(key);
  if (!entry) throw new Error(`Exercice inconnu dans la bibliothèque : ${key}`);
  return {
    id: keepLegacyIds ? key : newId(),
    name: entry.name,
    machineLabel: entry.machineLabel,
    muscles: entry.muscles,
    startWeight: entry.startWeight,
    unit: entry.unit,
    videoQuery: entry.videoQuery,
    photoQuery: entry.photoQuery,
    illustration: entry.illustration,
  };
}

export function exerciseFromLibrary(key: string, keepLegacyIds = false): Exercise {
  const entry = LIBRARY_BY_KEY.get(key)!;
  return {
    ...variantFromLibrary(key, keepLegacyIds),
    sets: entry.sets,
    reps: entry.reps,
    restSeconds: entry.restSeconds,
    alternatives: entry.alternativeKeys.map((alt) => variantFromLibrary(alt, keepLegacyIds)),
  };
}

export function customExercise(): Exercise {
  return {
    ...customVariant('Nouvel exercice'),
    sets: 3,
    reps: '10-12',
    restSeconds: 90,
    alternatives: [],
  };
}

export function customVariant(name: string): ExerciseVariant {
  return {
    id: newId(),
    name,
    machineLabel: '',
    muscles: '',
    startWeight: 0,
    unit: 'kg',
    videoQuery: '',
    photoQuery: '',
    illustration: 'gen',
  };
}

export function emptySession(name: string, days: number[] = []): Session {
  return { id: newId(), name, days, warmup: '', duration: '', exercises: [] };
}

/** Le programme « Machines en 3 séances ». */
export function onAirProgram(keepLegacyIds = false): Program {
  return {
    id: keepLegacyIds ? 'onair' : newId(),
    name: keepLegacyIds ? 'Programme On Air' : 'Machines en 3 séances',
    updatedAt: Date.now(),
    sessions: ON_AIR_SESSIONS.map((s) => ({
      id: keepLegacyIds ? s.legacyId : newId(),
      name: s.name,
      days: [s.day],
      warmup: s.warmup,
      duration: s.duration,
      exercises: s.exerciseKeys.map((key) => exerciseFromLibrary(key, keepLegacyIds)),
    })),
  };
}

export interface TemplateSummary {
  name: string;
  description: string;
  sessions: string;
}

/** Programme prêt à l'emploi pour `daysPerWeek` jours, s'il en existe un. */
export function templateSummary(daysPerWeek: number): TemplateSummary | null {
  if (daysPerWeek === 3) {
    return {
      name: 'Machines en 3 séances',
      description: 'Jambes et abdos, pectoraux et épaules, dos et bras.',
      sessions: ON_AIR_SESSIONS.map((s) => s.name).join(' · '),
    };
  }
  const template = READY_PROGRAMS[daysPerWeek];
  return template
    ? {
        name: template.name,
        description: template.description,
        sessions: template.sessions.map((s) => s.name).join(' · '),
      }
    : null;
}

export function readyProgram(daysPerWeek: number): Program {
  if (daysPerWeek === 3) return onAirProgram();
  const template = READY_PROGRAMS[daysPerWeek]!;
  const spread = template.days ?? WEEK_SPREAD[template.sessions.length]!;
  return {
    id: newId(),
    name: template.name,
    updatedAt: Date.now(),
    sessions: template.sessions.map((s, i) => ({
      id: newId(),
      name: s.name,
      days: [...spread[i]!],
      warmup: '5 à 10 min de cardio léger.',
      duration: '45 à 60 min',
      exercises: s.exerciseKeys.map((key) => exerciseFromLibrary(key)),
    })),
  };
}

export function blankProgram(daysPerWeek: number): Program {
  return {
    id: newId(),
    name: 'Mon programme',
    updatedAt: Date.now(),
    sessions: WEEK_SPREAD[daysPerWeek]!.map((days, i) =>
      emptySession(`Séance ${i + 1}`, [...days]),
    ),
  };
}

/** Copie indépendante d'un programme : nouveaux identifiants partout. */
export function duplicateProgram(source: Program, name: string): Program {
  return {
    id: newId(),
    name,
    updatedAt: Date.now(),
    sessions: source.sessions.map((s) => ({
      ...s,
      id: newId(),
      days: [...s.days],
      exercises: s.exercises.map((e) => ({
        ...e,
        id: newId(),
        alternatives: e.alternatives.map((a) => ({ ...a, id: newId() })),
      })),
    })),
  };
}
