/**
 * Lecture de l'ancien format (« Carnet v2 », la page unique) vers le format actuel.
 * L'ancien format utilisait des noms de champs très courts (n, m, mu, kg...).
 * Le résultat n'est qu'un brouillon : il passe ensuite par sanitizeState, qui vérifie tout.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Legacy = Record<string, any>;

function variant(a: Legacy): unknown {
  return {
    id: a['id'],
    name: a['n'],
    machineLabel: a['m'],
    muscles: a['mu'],
    startWeight: a['kg'],
    unit: a['u'],
    videoQuery: a['v'],
    photoQuery: a['q'],
    illustration: a['img'],
  };
}

function list(value: unknown): Legacy[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'object' && v !== null) : [];
}

export function programFromLegacy(p: Legacy): unknown {
  return {
    id: p['id'],
    name: p['name'],
    updatedAt: p['upd'],
    sessions: list(p['sessions']).map((s) => ({
      id: s['id'],
      name: s['name'],
      days: Array.isArray(s['days']) ? s['days'] : s['day'] != null ? [s['day']] : [],
      warmup: s['warm'],
      duration: s['dur'],
      exercises: list(s['ex']).map((e) => ({
        ...(variant(e) as object),
        sets: e['sets'],
        reps: e['reps'],
        restSeconds: e['rest'],
        alternatives: list(e['alts']).map(variant),
      })),
    })),
  };
}

const APPLIED: Record<string, string> = {
  use: 'use',
  keep: 'keep',
  rep: 'replace',
  alt: 'alternative',
};

/** `st` est l'objet stocké sous la clé « carnet-v2 » (ou le champ `st` d'une sauvegarde v2). */
export function stateFromLegacyV2(st: Legacy): unknown {
  const progress: Record<string, Record<string, { done: number; extra: number }>> = {};
  for (const [sessionId, counts] of Object.entries((st['cur'] ?? {}) as Legacy)) {
    const session: Record<string, { done: number; extra: number }> = {};
    for (const [key, count] of Object.entries((counts ?? {}) as Legacy)) {
      // « a1 » = séries cochées, « a1_x » = séries bonus.
      const extra = key.endsWith('_x');
      const exerciseId = extra ? key.slice(0, -2) : key;
      session[exerciseId] ??= { done: 0, extra: 0 };
      session[exerciseId][extra ? 'extra' : 'done'] = Number(count) || 0;
    }
    progress[sessionId] = session;
  }

  const settings = (st['set'] ?? {}) as Legacy;
  return {
    userName: st['name'],
    deviceId: st['did'],
    programs: list(st['progs']).map(programFromLegacy),
    activeProgramId: st['active'],
    progress,
    weights: st['kg'],
    selectedVariant: st['alt'],
    history: list(st['hist']).map((h) => ({
      id: h['id'],
      date: h['date'],
      programId: h['pid'],
      sessionId: h['sid'],
      sessionName: h['sn'],
      items: list(h['items']).map((i) => ({
        exerciseId: i['x'],
        variantId: i['vid'],
        name: i['n'],
        cardio: !!i['cardio'],
        unit: i['u'],
        setsDone: i['c'],
        setsPlanned: i['t'],
        weight: i['kg'],
      })),
    })),
    settings: {
      keepAwake: settings['wake'] !== false,
      lockScreenTimer: settings['lock'] === true,
      coachUrl: settings['coach'] ?? '',
    },
    coach: {
      messages: list(st['coach']?.['m']).map((m) => ({
        role: m['r'] === 'u' ? 'user' : 'assistant',
        text: m['t'],
        program: m['p'],
        swap: m['sw']
          ? { ...m['sw'], exerciseId: m['sw']['xid'], replacedName: m['sw']['old'] }
          : undefined,
        applied: APPLIED[m['ok']],
      })),
    },
    pendingSeedPhotos: st['seed'] === 1 || st['seed'] === true,
  };
}
