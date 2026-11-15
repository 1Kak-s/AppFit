import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ILLUSTRATIONS } from '../../core/data/illustrations.data';
import { LIBRARY } from '../../core/data/library.data';
import { ExerciseVariant, WEIGHT_UNITS, WeightUnit } from '../../core/models/program.model';
import { Illustration } from '../../shared/illustration';

export type VariantPatch = Partial<Omit<ExerciseVariant, 'id'>>;

/** Schémas proposés dans la liste : le générique, puis un par exercice de la bibliothèque. */
const ILLUSTRATION_CHOICES = (() => {
  const seen = new Set<string>();
  const choices = [{ key: 'gen', label: 'Icône générique' }];
  for (const entry of LIBRARY) {
    if (seen.has(entry.illustration) || !Object.hasOwn(ILLUSTRATIONS, entry.illustration)) continue;
    seen.add(entry.illustration);
    choices.push({ key: entry.illustration, label: entry.name });
  }
  return choices;
})();

/** Champs communs à un exercice et à une alternative : schéma, nom, machine, muscles, charge de départ. */
@Component({
  selector: 'app-variant-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Illustration],
  host: { style: 'display:contents' },
  template: `
    <div class="prev" [style.--sc]="color()">
      <svg
        viewBox="0 0 160 110"
        aria-hidden="true"
        [appIllustration]="variant().illustration"
      ></svg>
    </div>
    <label class="fld"
      >Nom
      <input
        #name
        maxlength="60"
        placeholder="Ex. Presse à cuisses"
        [value]="variant().name"
        (input)="changed.emit({ name: name.value })"
      />
    </label>
    <label class="fld"
      >Nom sur la machine
      <input
        #machine
        maxlength="60"
        placeholder="Ex. LEG PRESS"
        [value]="variant().machineLabel"
        (input)="changed.emit({ machineLabel: machine.value })"
      />
    </label>
    <label class="fld"
      >Muscles
      <input
        #muscles
        maxlength="120"
        placeholder="Ex. Quadriceps, fessiers"
        [value]="variant().muscles"
        (input)="changed.emit({ muscles: muscles.value })"
      />
    </label>
    <ng-content />
    @if (withWeight()) {
      <div class="two">
        <label class="fld"
          >Charge de départ
          <input
            #kg
            type="number"
            inputmode="decimal"
            step="0.5"
            min="0"
            max="1000"
            [value]="variant().startWeight"
            (input)="weight(kg.valueAsNumber)"
          />
        </label>
        <label class="fld"
          >Unité
          <select #unit (change)="changed.emit({ unit: asUnit(unit.value) })">
            @for (choice of units; track choice) {
              <option [value]="choice" [selected]="choice === variant().unit">{{ choice }}</option>
            }
          </select>
        </label>
      </div>
    }
    <label class="fld"
      >Schéma
      <select #picture (change)="changed.emit({ illustration: picture.value })">
        @for (choice of illustrations(); track choice.key) {
          <option [value]="choice.key" [selected]="choice.key === variant().illustration">
            {{ choice.label }}
          </option>
        }
      </select>
      @if (hint()) {
        <small>{{ hint() }}</small>
      }
    </label>
  `,
})
export class VariantFields {
  readonly variant = input.required<ExerciseVariant>();
  readonly color = input('var(--muted)');
  readonly withWeight = input(true);
  readonly hint = input('');
  readonly changed = output<VariantPatch>();

  protected readonly units = WEIGHT_UNITS;
  protected readonly illustrations = computed(() => ILLUSTRATION_CHOICES);

  protected weight(value: number): void {
    if (Number.isFinite(value) && value >= 0)
      this.changed.emit({ startWeight: Math.min(1000, value) });
  }

  protected asUnit(value: string): WeightUnit {
    return WEIGHT_UNITS.find((u) => u === value) ?? 'kg';
  }
}
