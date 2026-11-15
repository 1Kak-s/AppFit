/**
 * Lecture du tout premier format (« Carnet On Air », un seul programme figé) vers le format actuel.
 * Les identifiants de la v1 étaient les clés de la bibliothèque (a1, b2...) : le programme est donc
 * recréé avec ces mêmes identifiants pour que charges et historique s'y rattachent.
 */
import { ON_AIR_SESSIONS } from '../data/templates.data';
import { onAirProgram } from '../domain/program-factory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Legacy = Record<string, any>;

export function hasLegacyV1Data(old: Legacy | null): old is Legacy {
  return (
    !!old &&
    (old['hist']?.length > 0 ||
      Object.keys(old['kg'] ?? {}).length > 0 ||
      Object.keys(old['cur'] ?? {}).length > 0)
  );
}

export function stateFromLegacyV1(old: Legacy): unknown {
  const program = onAirProgram(true);

  // v1 : « alternative n°2 de a1 » ; aujourd'hui : identifiant de la variante, « a1x2 ».
  const selectedVariant: Record<string, string> = {};
  for (const [exerciseId, index] of Object.entries((old['alt'] ?? {}) as Legacy)) {
    if (index) selectedVariant[exerciseId] = `${exerciseId}x${index}`;
  }

  const progress: Record<string, Record<string, { done: number; extra: number }>> = {};
  for (const [sessionId, counts] of Object.entries((old['cur'] ?? {}) as Legacy)) {
    progress[sessionId] = {};
    for (const [key, count] of Object.entries((counts ?? {}) as Legacy)) {
      const extra = key.endsWith('_x');
      const exerciseId = extra ? key.slice(0, -2) : key;
      progress[sessionId][exerciseId] ??= { done: 0, extra: 0 };
      progress[sessionId][exerciseId][extra ? 'extra' : 'done'] = Number(count) || 0;
    }
  }

  const history = ((old['hist'] ?? []) as Legacy[]).flatMap((h) => {
    const template = ON_AIR_SESSIONS.find((s) => s.legacyId === h['s']);
    const session = program.sessions.find((s) => s.id === h['s']);
    if (!template || !session) return [];
    const items = session.exercises.flatMap((exercise) => {
      const altIndex = h['v']?.[exercise.id] || 0;
      const variant = altIndex ? exercise.alternatives[altIndex - 1] : exercise;
      const variantId = altIndex ? `${exercise.id}x${altIndex}` : exercise.id;
      const name = variant?.name ?? exercise.name;
      const done = h['c']?.[exercise.id] || 0;
      if (!exercise.sets)
        return done ? [{ exerciseId: exercise.id, variantId, name, cardio: true }] : [];
      const weight = h['w']?.[variantId];
      if (weight == null) return [];
      return [
        {
          exerciseId: exercise.id,
          variantId,
          name,
          cardio: false,
          unit: variant?.unit ?? 'kg',
          setsDone: done,
          setsPlanned: h['t']?.[exercise.id] || exercise.sets,
          weight,
        },
      ];
    });
    return [
      {
        date: h['date'],
        programId: program.id,
        sessionId: session.id,
        sessionName: template.name,
        items,
      },
    ];
  });

  return {
    userName: '',
    programs: [program],
    activeProgramId: program.id,
    progress,
    weights: old['kg'] ?? {},
    selectedVariant,
    history,
    pendingSeedPhotos: true,
  };
}
