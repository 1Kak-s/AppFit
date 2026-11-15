import { describe, expect, it } from 'vitest';
import { sanitizeState } from '../validation/sanitize';
import { hasLegacyV1Data, stateFromLegacyV1 } from './legacy-v1.mapper';
import { stateFromLegacyV2 } from './legacy-v2.mapper';

describe('reprise des données du Carnet v2', () => {
  it('convertit programmes, séries en cours, charges, historique et coach', () => {
    const v2 = {
      v: 2,
      name: 'Maxime',
      did: 'appareil-123',
      active: 'p1',
      progs: [
        {
          id: 'p1',
          name: 'Mon prog',
          upd: 1,
          sessions: [
            {
              id: 's1',
              name: 'Haut',
              days: [1],
              warm: 'Vélo',
              dur: '45 min',
              ex: [
                {
                  id: 'e1',
                  n: 'Presse',
                  m: 'LEG PRESS',
                  mu: 'Quadris',
                  sets: 3,
                  reps: '10',
                  rest: 90,
                  kg: 50,
                  u: 'kg',
                  v: '',
                  q: '',
                  img: 'a1',
                  alts: [{ id: 'e2', n: 'Squat', kg: 20, img: 'gen' }],
                },
              ],
            },
          ],
        },
      ],
      cur: { s1: { e1: 2, e1_x: 1 } },
      kg: { e1: 60 },
      alt: { e1: 'e2' },
      hist: [
        {
          id: 'h1',
          date: '2026-11-10T10:00:00.000Z',
          pid: 'p1',
          sid: 's1',
          sn: 'Haut',
          items: [{ x: 'e1', vid: 'e1', n: 'Presse', u: 'kg', c: 3, t: 3, kg: 55 }],
        },
      ],
      set: { wake: false, lock: true, coach: 'https://coach.example.com' },
      coach: {
        m: [
          { r: 'u', t: 'Salut' },
          {
            r: 'a',
            t: 'Remplace par',
            sw: { xid: 'e1', old: 'Presse', name: 'Fentes', key: null },
            ok: 'rep',
          },
        ],
      },
    };

    const state = sanitizeState(stateFromLegacyV2(v2))!;

    expect(state.userName).toBe('Maxime');
    expect(state.deviceId).toBe('appareil-123');
    expect(state.programs[0]!.sessions[0]!.exercises[0]).toMatchObject({
      id: 'e1',
      name: 'Presse',
      machineLabel: 'LEG PRESS',
      startWeight: 50,
      restSeconds: 90,
    });
    expect(state.programs[0]!.sessions[0]!.exercises[0]!.alternatives[0]).toMatchObject({
      id: 'e2',
      name: 'Squat',
    });
    expect(state.progress).toEqual({ s1: { e1: { done: 2, extra: 1 } } });
    expect(state.weights).toEqual({ e1: 60 });
    expect(state.selectedVariant).toEqual({ e1: 'e2' });
    expect(state.history[0]!.items[0]).toMatchObject({ variantId: 'e1', setsDone: 3, weight: 55 });
    expect(state.settings).toEqual({
      keepAwake: false,
      lockScreenTimer: true,
      coachUrl: 'https://coach.example.com',
    });
    expect(state.coach.messages[1]).toMatchObject({
      swap: { exerciseId: 'e1', replacedName: 'Presse', name: 'Fentes' },
      applied: 'replace',
    });
  });
});

describe('reprise des données du Carnet On Air (v1)', () => {
  it('rattache charges et historique au programme recréé', () => {
    const v1 = {
      kg: { a1: 70, a1x1: 25 },
      alt: { a1: 1 },
      cur: {},
      hist: [
        {
          date: '2026-11-01T10:00:00.000Z',
          s: 'A',
          c: { a1: 3, a6: 1 },
          t: { a1: 3 },
          v: { a1: 1 },
          w: { a1x1: 25 },
        },
      ],
    };
    expect(hasLegacyV1Data(v1)).toBe(true);

    const state = sanitizeState(stateFromLegacyV1(v1))!;

    expect(state.programs[0]!.sessions[0]!.exercises[0]!.id).toBe('a1');
    expect(state.weights['a1']).toBe(70);
    expect(state.selectedVariant).toEqual({ a1: 'a1x1' });
    expect(state.history[0]!.items.map((i) => i.variantId)).toEqual(['a1x1', 'a6']);
    expect(state.pendingSeedPhotos).toBe(true);
  });

  it("ne déclenche rien s'il n'y a pas de données", () => {
    expect(hasLegacyV1Data({ kg: {}, hist: [], cur: {} })).toBe(false);
  });
});
