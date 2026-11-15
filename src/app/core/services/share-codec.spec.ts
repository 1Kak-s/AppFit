import { describe, expect, it } from 'vitest';
import { exerciseFromLibrary, onAirProgram } from '../domain/program-factory';
import { decodeProgram, encodeProgram, extractCode } from './share-codec';

function withoutIds(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, v) => (key === 'id' || key === 'updatedAt' ? undefined : v)),
  );
}

describe('partage de programme', () => {
  it("restitue le programme à l'identique, avec de nouveaux identifiants", async () => {
    const program = onAirProgram();
    program.sessions[0]!.exercises[0]!.name = 'Presse modifiée';
    program.sessions[0]!.exercises.push({
      ...exerciseFromLibrary('b1'),
      illustration: 'gen',
      name: 'Exercice perso',
      reps: '8',
    });

    const shared = await decodeProgram(await encodeProgram(program, 'Maxime'));

    expect(shared.from).toBe('Maxime');
    expect(withoutIds(shared.program)).toEqual(withoutIds(program));
    expect(shared.program.id).not.toBe(program.id);
  });

  it("n'envoie que la clé des exercices de la bibliothèque", async () => {
    const program = onAirProgram();
    expect((await encodeProgram(program, '')).length).toBeLessThan(
      JSON.stringify(program).length / 3,
    );
  });

  it('refuse un code abîmé ou étranger', async () => {
    await expect(decodeProgram('Zpas-un-vrai-code')).rejects.toThrow();
    await expect(decodeProgram('J' + btoa('{"t":"autre"}'))).rejects.toThrow();
    await expect(decodeProgram('Z' + 'A'.repeat(70_000))).rejects.toThrow();
  });

  it('retrouve le code dans un lien, ancien ou nouveau', () => {
    expect(extractCode('https://moi.github.io/carnet/#p=ZabcdefghijklmnopQ')).toBe(
      'ZabcdefghijklmnopQ',
    );
    expect(extractCode('https://moi.github.io/carnet/#/importer/ZabcdefghijklmnopQ')).toBe(
      'ZabcdefghijklmnopQ',
    );
    expect(extractCode('Regarde : ZabcdefghijklmnopQ !')).toBe('ZabcdefghijklmnopQ');
    expect(extractCode('rien ici')).toBeNull();
  });
});
