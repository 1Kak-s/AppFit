import { describe, expect, it } from 'vitest';
import { onAirProgram } from '../domain/program-factory';
import {
  LIMITS,
  sanitizeCoachUrl,
  sanitizePhoto,
  sanitizeProgram,
  sanitizeProgramProposal,
  sanitizeState,
} from './sanitize';

describe('sanitizeProgram', () => {
  it('garde un programme valide tel quel', () => {
    const program = onAirProgram();
    expect(sanitizeProgram(structuredClone(program))).toEqual(program);
  });

  it('refuse ce qui ne ressemble pas à un programme', () => {
    expect(sanitizeProgram(null)).toBeNull();
    expect(sanitizeProgram('programme')).toBeNull();
    expect(sanitizeProgram({ name: 'Sans séances' })).toBeNull();
  });

  it('borne les valeurs et remplace ce qui est invalide', () => {
    const program = sanitizeProgram({
      id: '<script>',
      name: 'x'.repeat(500),
      sessions: [
        {
          days: [1, 1, 9, -1, 'lundi'],
          exercises: [
            {
              name: 'Presse',
              sets: 99,
              restSeconds: 99999,
              unit: 'tonnes',
              illustration: 'inconnu',
              videoQuery: '"><img src=x onerror=alert(1)>',
            },
          ],
        },
      ],
    })!;

    expect(program.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(program.name).toHaveLength(60);
    const exercise = program.sessions[0]!.exercises[0]!;
    expect(program.sessions[0]!.days).toEqual([1]);
    expect(exercise.sets).toBe(8);
    expect(exercise.restSeconds).toBe(600);
    expect(exercise.unit).toBe('kg');
    expect(exercise.illustration).toBe('gen');
    expect(exercise.videoQuery).toBe('');
  });

  it('donne des identifiants uniques même si la source les duplique', () => {
    const program = sanitizeProgram({
      sessions: [{ id: 'a', exercises: [{ id: 'a' }, { id: 'a' }] }],
    })!;
    const ids = [
      program.id,
      program.sessions[0]!.id,
      ...program.sessions[0]!.exercises.map((e) => e.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("limite le nombre d'exercices", () => {
    const program = sanitizeProgram({
      sessions: [{ exercises: Array.from({ length: 500 }, () => ({ name: 'X' })) }],
    })!;
    expect(program.sessions[0]!.exercises).toHaveLength(LIMITS.exercises);
  });
});

describe('sanitizeState', () => {
  it('ignore les clés dangereuses des dictionnaires', () => {
    const state = sanitizeState({
      programs: [onAirProgram()],
      weights: JSON.parse('{"__proto__": 5, "a1": 40, "b1": "lourd"}'),
    })!;
    expect(state.weights).toEqual({ a1: 40 });
    expect(Object.getPrototypeOf(state.weights)).toBe(Object.prototype);
  });

  it('refuse un état sans programme', () => {
    expect(sanitizeState({ programs: [] })).toBeNull();
  });
});

describe('sanitizeCoachUrl', () => {
  it('accepte HTTPS et un serveur local, et retire la barre finale', () => {
    expect(sanitizeCoachUrl('https://coach.example.com/')).toBe('https://coach.example.com');
    expect(sanitizeCoachUrl('http://localhost:5080')).toBe('http://localhost:5080');
  });

  it('refuse le reste', () => {
    expect(sanitizeCoachUrl('http://coach.example.com')).toBe('');
    expect(sanitizeCoachUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeCoachUrl('https://moi:secret@coach.example.com')).toBe('');
    expect(sanitizeCoachUrl('pas une adresse')).toBe('');
  });
});

describe('sanitizePhoto', () => {
  it("n'accepte que des images encodées dans la page", () => {
    expect(sanitizePhoto('data:image/jpeg;base64,AAAA')).toEqual({
      src: 'data:image/jpeg;base64,AAAA',
      position: '50% 50%',
    });
    expect(sanitizePhoto('https://pistage.example/image.jpg')).toBeNull();
    expect(sanitizePhoto('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(sanitizePhoto({ src: 'data:image/png;base64,AAAA', position: 'url(x)' })?.position).toBe(
      '50% 50%',
    );
  });
});

describe('sanitizeProgramProposal', () => {
  it('ne garde que les clés de bibliothèque connues', () => {
    const proposal = sanitizeProgramProposal({
      name: 'P',
      sessions: [
        {
          name: 'A',
          exercises: [
            { key: 'a1', name: 'Presse' },
            { key: 'zz9', name: 'Inventé' },
          ],
        },
      ],
    })!;
    expect(proposal.sessions[0]!.exercises.map((e) => e.key)).toEqual(['a1', null]);
  });
});
