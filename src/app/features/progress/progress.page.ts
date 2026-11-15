import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { formatKg, shortDate, variantsOf } from '../../core/domain/format';
import { CarnetStore } from '../../core/state/carnet.store';

interface WeightRow {
  name: string;
  alternative: boolean;
  unit: string;
  current: number | null;
  gain: number;
  /** Tracé de la courbe des 12 dernières charges, vide s'il y en a moins de 2. */
  spark: string;
}

/** Charges actuelles par exercice, avec leur évolution, puis l'historique des séances. */
@Component({
  selector: 'app-progress-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.page.html',
})
export class ProgressPage {
  protected readonly store = inject(CarnetStore);
  protected readonly formatKg = formatKg;
  protected readonly shortDate = shortDate;

  protected readonly groups = computed(() => {
    const history = this.store.history();
    return this.store
      .sessions()
      .map((session) => ({
        name: session.name,
        color: this.store.colorOf(session.id),
        rows: session.exercises
          .filter((e) => e.sets > 0)
          .flatMap((exercise) =>
            variantsOf(exercise).flatMap((variant, index): WeightRow[] => {
              // Du plus récent au plus ancien, comme l'historique.
              const weights = history.flatMap((log) =>
                log.items
                  .filter((i) => i.variantId === variant.id && i.weight != null)
                  .map((i) => i.weight!),
              );
              if (index > 0 && weights.length === 0) return [];
              const current = weights[0] ?? null;
              const first = weights.at(-1) ?? 0;
              return [
                {
                  name: variant.name,
                  alternative: index > 0,
                  unit: variant.unit,
                  current,
                  gain: current !== null ? current - first : 0,
                  spark: sparkPath(weights),
                },
              ];
            }),
          ),
      }))
      .filter((group) => group.rows.length > 0);
  });

  protected readonly logs = computed(() =>
    this.store
      .history()
      .slice(0, 40)
      .map((log) => {
        const program = this.store.programs().find((p) => p.id === log.programId) ?? null;
        return {
          ...log,
          color: program ? this.store.colorOf(log.sessionId, program) : 'var(--muted)',
        };
      }),
  );
}

function sparkPath(weights: number[]): string {
  if (weights.length < 2) return '';
  const values = weights.slice(0, 12).reverse();
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  return values
    .map(
      (y, i) =>
        `${i ? 'L' : 'M'}${(2 + (i * 52) / (values.length - 1)).toFixed(1)} ${(20 - ((y - min) / range) * 18).toFixed(1)}`,
    )
    .join('');
}
