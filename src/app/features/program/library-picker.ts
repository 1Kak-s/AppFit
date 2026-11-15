import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LIBRARY, LibraryEntry, MUSCLE_GROUPS } from '../../core/data/library.data';
import { Illustration } from '../../shared/illustration';
import { Sheet } from '../../shared/sheet';

/** Choix d'un exercice dans la bibliothèque, avec recherche par nom, machine ou muscle. */
@Component({
  selector: 'app-library-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet, Illustration],
  template: `
    <app-sheet [tall]="true" (closed)="closed.emit()">
      <h4>{{ title() }}</h4>
      <div class="libsearch">
        <input
          #search
          class="paste"
          style="min-height:46px"
          type="search"
          maxlength="40"
          placeholder="Chercher : presse, dos, haltères…"
          aria-label="Chercher un exercice"
          (input)="query.set(search.value)"
        />
      </div>
      <div class="liblist">
        @for (group of groups(); track group.name) {
          <div class="libg">{{ group.name }}</div>
          @for (entry of group.entries; track entry.key) {
            <button type="button" class="libi" (click)="picked.emit(entry.key)">
              <svg
                viewBox="0 0 160 110"
                aria-hidden="true"
                [appIllustration]="entry.illustration"
              ></svg>
              <span
                ><b>{{ entry.name }}</b
                ><small>{{ entry.machineLabel }} · {{ entry.muscles }}</small></span
              >
            </button>
          }
        } @empty {
          <div class="empty">Rien trouvé. Ferme et crée un exercice perso.</div>
        }
      </div>
      <button type="button" class="cancel" (click)="closed.emit()">Fermer</button>
    </app-sheet>
  `,
})
export class LibraryPicker {
  readonly title = input.required<string>();
  /** Clé de l'exercice choisi. */
  readonly picked = output<string>();
  readonly closed = output<void>();

  protected readonly query = signal('');
  protected readonly groups = computed(() => {
    const wanted = normalize(this.query());
    const seen = new Set<string>();
    return MUSCLE_GROUPS.map((name) => ({
      name,
      entries: LIBRARY.filter((entry: LibraryEntry) => {
        if (entry.group !== name || seen.has(entry.name)) return false;
        const match =
          !wanted ||
          normalize(`${entry.name} ${entry.machineLabel} ${entry.muscles} ${entry.group}`).includes(
            wanted,
          );
        if (match) seen.add(entry.name);
        return match;
      }),
    })).filter((group) => group.entries.length > 0);
  });
}

/** Minuscules sans accents, pour que « epaules » trouve « Épaules ». */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
