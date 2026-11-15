import { Exercise, ExerciseVariant, WeightUnit } from '../models/program.model';

export const DAYS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;
export const SHORT_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const;
/** Ordre d'affichage de la semaine : lundi en premier. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const REST_CHOICES = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240] as const;
export const SESSION_COLORS = [
  'var(--a)',
  'var(--b)',
  'var(--c)',
  'var(--d)',
  'var(--e)',
  'var(--f)',
] as const;

const YOUTUBE_SEARCH = 'https://www.youtube.com/results?search_query=';
const IMAGE_SEARCH = 'https://www.google.com/search?tbm=isch&q=';

export function daysText(days: readonly number[]): string {
  const ordered = WEEK_ORDER.filter((d) => days.includes(d));
  if (ordered.length === 0) return '';
  return ordered.length === 1 ? DAYS[ordered[0]!]! : ordered.map((d) => SHORT_DAYS[d]).join(' · ');
}

export function restText(seconds: number): string {
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    : `${seconds} s`;
}

export function formatKg(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',');
}

export function parseKg(text: string): number | null {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Les haltères montent de 1 kg, les machines de 2,5 kg. */
export function weightStep(unit: WeightUnit): number {
  return unit === 'kg/main' || unit === 'kg/côté' ? 1 : 2.5;
}

/** « 3 × 10-12 », ou la durée pour un cardio. */
export function prescription(exercise: Pick<Exercise, 'sets' | 'reps'>): string {
  return exercise.sets ? `${exercise.sets} × ${exercise.reps || '?'}` : exercise.reps;
}

/** La machine prévue suivie de ses alternatives. */
export function variantsOf(exercise: Exercise): ExerciseVariant[] {
  return [exercise, ...exercise.alternatives];
}

export function videoUrl(variant: ExerciseVariant): string {
  const query =
    variant.videoQuery ||
    encodeURIComponent(`${variant.name} exécution musculation`).replace(/%20/g, '+');
  return YOUTUBE_SEARCH + query;
}

export function photoQueryOf(variant: ExerciseVariant): string {
  const base = (variant.machineLabel || variant.name).split('/')[0]!.trim().toLowerCase();
  return variant.photoQuery || `${base} machine salle de sport`;
}

export function photoSearchUrl(variant: ExerciseVariant): string {
  return IMAGE_SEARCH + encodeURIComponent(photoQueryOf(variant));
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}
