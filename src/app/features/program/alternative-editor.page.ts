import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CarnetStore } from '../../core/state/carnet.store';
import { VariantFields } from './variant-fields';

/** Édition d'une alternative : ses séries et son repos sont ceux de l'exercice qu'elle remplace. */
@Component({
  selector: 'app-alternative-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VariantFields],
  template: `
    @if (exercise(); as e) {
      <a class="back" [routerLink]="['/programme/seance', sessionId(), 'exercice', e.id]"
        >‹ {{ e.name }}</a
      >
      @if (alternative(); as a) {
        <h2 class="h2" style="margin-top:4px">{{ a.name || 'Alternative' }}</h2>
        <div class="card">
          <app-variant-fields
            [variant]="a"
            [color]="color()"
            [withWeight]="e.sets > 0"
            (changed)="store.updateAlternative(e.id, a.id, $event)"
          />
        </div>
        <p class="note">Séries, répétitions et repos sont les mêmes que pour « {{ e.name }} ».</p>
        <button type="button" class="danger-l" (click)="remove()">
          Supprimer cette alternative
        </button>
      } @else {
        <div class="empty">Cette alternative n'existe plus.</div>
      }
    } @else {
      <div class="empty">Cet exercice n'existe plus.</div>
    }
  `,
})
export class AlternativeEditorPage {
  protected readonly store = inject(CarnetStore);
  private readonly router = inject(Router);

  /** Paramètres de route. */
  readonly sessionId = input.required<string>();
  readonly exerciseId = input.required<string>();
  readonly alternativeId = input.required<string>();

  protected readonly exercise = computed(
    () =>
      this.store.session(this.sessionId())?.exercises.find((e) => e.id === this.exerciseId()) ??
      null,
  );
  protected readonly alternative = computed(
    () => this.exercise()?.alternatives.find((a) => a.id === this.alternativeId()) ?? null,
  );
  protected readonly color = computed(() => this.store.colorOf(this.sessionId()));

  protected remove(): void {
    this.store.deleteAlternative(this.exerciseId(), this.alternativeId());
    void this.router.navigate([
      '/programme/seance',
      this.sessionId(),
      'exercice',
      this.exerciseId(),
    ]);
  }
}
