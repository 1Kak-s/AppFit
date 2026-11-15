/**
 * Tout ce qui vient de l'extérieur passe par ici avant d'entrer dans l'app : lien de programme partagé,
 * fichier de sauvegarde, réponse du coach, et même le stockage du téléphone.
 * Chaque fonction part d'une valeur inconnue et rend un objet du bon type, aux tailles bornées, ou null.
 */
import { ILLUSTRATIONS } from '../data/illustrations.data';
import { LIBRARY_BY_KEY } from '../data/library.data';
import { newId } from '../domain/ids';
import {
  AppliedAction,
  CoachMessage,
  ExerciseProposal,
  ProgramProposal,
  SwapProposal,
} from '../models/coach.model';
import {
  Exercise,
  ExerciseVariant,
  Program,
  Session,
  WEIGHT_UNITS,
  WeightUnit,
} from '../models/program.model';
import {
  CarnetState,
  ExerciseProgress,
  LoggedItem,
  Photo,
  Settings,
  WorkoutLog,
} from '../models/state.model';

export const LIMITS = {
  programs: 30,
  sessions: 14,
  exercises: 30,
  alternatives: 6,
  history: 1000,
  logItems: 60,
  coachMessages: 40,
  records: 5000,
  photos: 400,
  photoChars: 2_000_000,
} as const;

type Raw = Record<string, unknown>;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const QUERY_PATTERN = /^[A-Za-z0-9%+._~-]{0,300}$/;
const PHOTO_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const POSITION_PATTERN = /^\d{1,3}% \d{1,3}%$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

// ----- briques de base -----

export function asRecord(value: unknown): Raw | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : null;
}

function asArray(value: unknown, max: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

export function text(value: unknown, max: number, fallback = ''): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, max);
  if (typeof value !== 'string') return fallback;
  return value.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

export function integer(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof n === 'number' && Number.isFinite(n)
    ? Math.min(max, Math.max(min, Math.round(n)))
    : fallback;
}

function decimal(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof n === 'number' && Number.isFinite(n)
    ? Math.min(max, Math.max(min, Math.round(n * 100) / 100))
    : fallback;
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function unit(value: unknown): WeightUnit {
  return WEIGHT_UNITS.includes(value as WeightUnit) ? (value as WeightUnit) : 'kg';
}

function illustration(value: unknown): string {
  return typeof value === 'string' && Object.hasOwn(ILLUSTRATIONS, value) ? value : 'gen';
}

/** Morceau d'URL de recherche déjà encodé : on n'accepte que des caractères sans effet sur l'URL. */
function encodedQuery(value: unknown): string {
  return typeof value === 'string' && QUERY_PATTERN.test(value) ? value : '';
}

function days(value: unknown): number[] {
  const list = Array.isArray(value) ? value : typeof value === 'number' ? [value] : [];
  return [...new Set(list.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))];
}

/** Donne un identifiant valide et jamais vu : garde celui fourni s'il convient, sinon en crée un. */
function uniqueId(value: unknown, seen: Set<string>): string {
  const id = isId(value) && !seen.has(value) ? value : newId();
  seen.add(id);
  return id;
}

// ----- programmes -----

function sanitizeVariant(value: unknown, seen: Set<string>): ExerciseVariant | null {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    id: uniqueId(raw['id'], seen),
    name: text(raw['name'], 60) || 'Exercice',
    machineLabel: text(raw['machineLabel'], 60),
    muscles: text(raw['muscles'], 120),
    startWeight: decimal(raw['startWeight'], 0, 1000, 0),
    unit: unit(raw['unit']),
    videoQuery: encodedQuery(raw['videoQuery']),
    photoQuery: text(raw['photoQuery'], 80),
    illustration: illustration(raw['illustration']),
  };
}

function sanitizeExercise(value: unknown, seen: Set<string>): Exercise | null {
  const raw = asRecord(value);
  const variant = sanitizeVariant(value, seen);
  if (!raw || !variant) return null;
  const sets = integer(raw['sets'], 0, 8, 3);
  return {
    ...variant,
    sets,
    reps: text(raw['reps'], 24) || (sets ? '10-12' : '10 min'),
    restSeconds: integer(raw['restSeconds'], 0, 600, sets ? 90 : 0),
    alternatives: asArray(raw['alternatives'], LIMITS.alternatives)
      .map((a) => sanitizeVariant(a, seen))
      .filter((a): a is ExerciseVariant => a !== null),
  };
}

function sanitizeSession(value: unknown, index: number, seen: Set<string>): Session | null {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    id: uniqueId(raw['id'], seen),
    name: text(raw['name'], 40) || `Séance ${index + 1}`,
    days: days(raw['days']),
    warmup: text(raw['warmup'], 200),
    duration: text(raw['duration'], 40),
    exercises: asArray(raw['exercises'], LIMITS.exercises)
      .map((e) => sanitizeExercise(e, seen))
      .filter((e): e is Exercise => e !== null),
  };
}

/** `seen` permet de garantir des identifiants uniques sur plusieurs programmes à la fois. */
export function sanitizeProgram(value: unknown, seen = new Set<string>()): Program | null {
  const raw = asRecord(value);
  if (!raw || !Array.isArray(raw['sessions'])) return null;
  return {
    id: uniqueId(raw['id'], seen),
    name: text(raw['name'], 60) || 'Mon programme',
    updatedAt: integer(raw['updatedAt'], 0, Number.MAX_SAFE_INTEGER, Date.now()),
    sessions: asArray(raw['sessions'], LIMITS.sessions)
      .map((s, i) => sanitizeSession(s, i, seen))
      .filter((s): s is Session => s !== null),
  };
}

// ----- propositions du coach -----

function libraryKey(value: unknown): string | null {
  return typeof value === 'string' && LIBRARY_BY_KEY.has(value) ? value : null;
}

function sanitizeExerciseProposal(value: unknown): ExerciseProposal | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const key = libraryKey(raw['key']);
  const name = text(raw['name'], 60);
  if (!key && !name) return null;
  const sets = integer(raw['sets'], 0, 8, 3);
  return {
    key,
    name: name || 'Exercice',
    muscles: text(raw['muscles'], 60) || null,
    sets,
    reps: text(raw['reps'], 24) || (sets ? '10-12' : '10 min'),
    rest: integer(raw['rest'], 0, 600, sets ? 90 : 0),
  };
}

export function sanitizeProgramProposal(value: unknown): ProgramProposal | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const sessions = asArray(raw['sessions'], 7)
    .map((s, i) => {
      const session = asRecord(s);
      if (!session) return null;
      const exercises = asArray(session['exercises'], 12)
        .map(sanitizeExerciseProposal)
        .filter((e): e is ExerciseProposal => e !== null);
      return exercises.length
        ? {
            name: text(session['name'], 40) || `Séance ${i + 1}`,
            days: days(session['days']),
            exercises,
          }
        : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  return sessions.length ? { name: text(raw['name'], 60) || 'Programme du coach', sessions } : null;
}

/** `value` est le remplacement tel que stocké (avec exerciseId et replacedName déjà résolus). */
export function sanitizeSwapProposal(value: unknown): SwapProposal | null {
  const raw = asRecord(value);
  if (!raw || !isId(raw['exerciseId'])) return null;
  const key = libraryKey(raw['key']);
  const name = text(raw['name'], 60);
  if (!key && !name) return null;
  return {
    exerciseId: raw['exerciseId'],
    replacedName: text(raw['replacedName'], 60),
    key,
    name: name || 'Exercice',
    muscles: text(raw['muscles'], 60) || null,
    sets: raw['sets'] == null ? null : integer(raw['sets'], 0, 8, 3),
    reps: text(raw['reps'], 24) || null,
    rest: raw['rest'] == null ? null : integer(raw['rest'], 0, 600, 90),
  };
}

const APPLIED: readonly AppliedAction[] = ['use', 'keep', 'replace', 'alternative'];

function sanitizeCoachMessage(value: unknown): CoachMessage | null {
  const raw = asRecord(value);
  const body = raw ? text(raw['text'], 3000) : '';
  if (!raw || !body) return null;
  const message: CoachMessage = { role: raw['role'] === 'user' ? 'user' : 'assistant', text: body };
  const program = sanitizeProgramProposal(raw['program']);
  const swap = program ? null : sanitizeSwapProposal(raw['swap']);
  if (program) message.program = program;
  if (swap) message.swap = swap;
  if ((program || swap) && APPLIED.includes(raw['applied'] as AppliedAction))
    message.applied = raw['applied'] as AppliedAction;
  return message;
}

// ----- état complet -----

/** Adresse du coach : HTTPS obligatoire, sauf pour un serveur lancé sur la machine elle-même. */
export function sanitizeCoachUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 200) return '';
  try {
    const url = new URL(value.trim());
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return '';
    if (url.username || url.password) return '';
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function sanitizeSettings(value: unknown): Settings {
  const raw = asRecord(value) ?? {};
  return {
    keepAwake: raw['keepAwake'] !== false,
    lockScreenTimer: raw['lockScreenTimer'] === true,
    coachUrl: sanitizeCoachUrl(raw['coachUrl']),
  };
}

/** Recopie un dictionnaire en ne gardant que les clés valides, dans la limite de `LIMITS.records` entrées. */
function sanitizeRecord<T>(value: unknown, item: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  const raw = asRecord(value);
  if (!raw) return out;
  for (const key of Object.keys(raw).slice(0, LIMITS.records)) {
    const clean = isId(key) ? item(raw[key]) : null;
    if (clean !== null) out[key] = clean;
  }
  return out;
}

function sanitizeProgress(value: unknown): ExerciseProgress | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const progress = { done: integer(raw['done'], 0, 16, 0), extra: integer(raw['extra'], 0, 8, 0) };
  return progress.done || progress.extra ? progress : null;
}

function sanitizeLogItem(value: unknown): LoggedItem | null {
  const raw = asRecord(value);
  if (!raw || !isId(raw['exerciseId']) || !isId(raw['variantId'])) return null;
  const base = {
    exerciseId: raw['exerciseId'],
    variantId: raw['variantId'],
    name: text(raw['name'], 60) || 'Exercice',
  };
  if (raw['cardio'] === true) return { ...base, cardio: true };
  return {
    ...base,
    cardio: false,
    unit: unit(raw['unit']),
    setsDone: integer(raw['setsDone'], 0, 16, 0),
    setsPlanned: integer(raw['setsPlanned'], 0, 16, 0),
    weight: decimal(raw['weight'], 0, 1000, 0),
  };
}

function sanitizeLog(value: unknown): WorkoutLog | null {
  const raw = asRecord(value);
  const date = raw ? text(raw['date'], 40) : '';
  if (!raw || Number.isNaN(Date.parse(date))) return null;
  return {
    id: isId(raw['id']) ? raw['id'] : newId(),
    date,
    programId: text(raw['programId'], 40),
    sessionId: text(raw['sessionId'], 40),
    sessionName: text(raw['sessionName'], 40) || 'Séance',
    items: asArray(raw['items'], LIMITS.logItems)
      .map(sanitizeLogItem)
      .filter((i): i is LoggedItem => i !== null),
  };
}

export function sanitizeState(value: unknown): CarnetState | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const seen = new Set<string>();
  const programs = asArray(raw['programs'], LIMITS.programs)
    .map((p) => sanitizeProgram(p, seen))
    .filter((p): p is Program => p !== null);
  if (programs.length === 0) return null;

  const coach = asRecord(raw['coach']);
  return {
    version: 3,
    userName: text(raw['userName'], 40),
    deviceId: isId(raw['deviceId']) && raw['deviceId'].length >= 6 ? raw['deviceId'] : newId(),
    programs,
    activeProgramId: programs.some((p) => p.id === raw['activeProgramId'])
      ? (raw['activeProgramId'] as string)
      : programs[0]!.id,
    progress: sanitizeRecord(raw['progress'], (session) =>
      sanitizeRecord(session, sanitizeProgress),
    ),
    weights: sanitizeRecord(raw['weights'], (w) =>
      typeof w === 'number' && Number.isFinite(w) ? decimal(w, 0, 1000, 0) : null,
    ),
    selectedVariant: sanitizeRecord(raw['selectedVariant'], (id) => (isId(id) ? id : null)),
    history: asArray(raw['history'], LIMITS.history)
      .map(sanitizeLog)
      .filter((l): l is WorkoutLog => l !== null),
    settings: sanitizeSettings(raw['settings']),
    coach: {
      messages: asArray(coach?.['messages'], 200)
        .map(sanitizeCoachMessage)
        .filter((m): m is CoachMessage => m !== null)
        .slice(-LIMITS.coachMessages),
    },
    pendingSeedPhotos: raw['pendingSeedPhotos'] === true,
  };
}

// ----- photos -----

export function sanitizePhoto(value: unknown): Photo | null {
  const raw = typeof value === 'string' ? { src: value } : asRecord(value);
  const src = raw?.['src'];
  if (typeof src !== 'string' || src.length > LIMITS.photoChars || !PHOTO_PATTERN.test(src))
    return null;
  const position = raw?.['position'] ?? raw?.['pos'];
  return {
    src,
    position:
      typeof position === 'string' && POSITION_PATTERN.test(position) ? position : '50% 50%',
  };
}

export function sanitizePhotos(value: unknown): Record<string, Photo> {
  const out: Record<string, Photo> = {};
  const raw = asRecord(value);
  if (!raw) return out;
  for (const key of Object.keys(raw).slice(0, LIMITS.photos)) {
    const photo = isId(key) ? sanitizePhoto(raw[key]) : null;
    if (photo) out[key] = photo;
  }
  return out;
}
