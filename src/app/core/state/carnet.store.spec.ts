import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { customVariant, exerciseFromLibrary, onAirProgram } from '../domain/program-factory';
import { CarnetStore } from './carnet.store';

describe('CarnetStore', () => {
  let store: CarnetStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    store = TestBed.inject(CarnetStore);
    store.createProfile('Maxime', onAirProgram());
  });

  const first = () => store.sessions()[0]!;
  const firstExercise = () => first().exercises[0]!;

  it('enregistre chaque modification sur le téléphone', () => {
    store.setUserName('Léa');
    expect(JSON.parse(localStorage.getItem('carnet-v3')!).userName).toBe('Léa');
  });

  it('coche et décoche les séries', () => {
    const exercise = firstExercise();
    expect(store.toggleSet(first().id, exercise, 0)).toEqual({
      done: 1,
      total: 3,
      increased: true,
    });
    expect(store.toggleSet(first().id, exercise, 1).done).toBe(2);
    expect(store.toggleSet(first().id, exercise, 1)).toEqual({
      done: 1,
      total: 3,
      increased: false,
    });
  });

  it('termine la séance : historique avec la charge de la variante choisie, puis remise à zéro', () => {
    const exercise = firstExercise();
    const alternative = exercise.alternatives[0]!;
    store.selectVariant(exercise, alternative.id);
    store.setWeight(alternative.id, 42.5);
    store.toggleSet(first().id, exercise, 2);

    store.finishSession(first().id);

    expect(store.history()[0]!.items).toEqual([
      expect.objectContaining({
        variantId: alternative.id,
        name: alternative.name,
        weight: 42.5,
        setsDone: 3,
      }),
    ]);
    expect(store.progressOf(first().id, exercise.id).done).toBe(0);
  });

  it("remplace un exercice en gardant l'ancien en alternative", () => {
    const previous = firstExercise();
    store.replaceExercise(previous.id, exerciseFromLibrary('a3'));
    expect(firstExercise().name).toBe('Leg extension');
    expect(firstExercise().alternatives[0]).toMatchObject({ id: previous.id, name: previous.name });
  });

  it('respecte les limites', () => {
    const exercise = firstExercise();
    for (let i = 0; i < 10; i++) store.addAlternative(exercise.id, customVariant(`Alt ${i}`));
    expect(firstExercise().alternatives.length).toBe(6);
  });

  it("ne garde pas de référence partagée avec l'état publié", () => {
    const before = store.state();
    store.setWeight('a1', 80);
    expect(before).not.toBe(store.state());
    expect(before!.weights['a1']).toBeUndefined();
  });
});
