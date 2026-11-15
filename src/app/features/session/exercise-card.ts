import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  formatKg,
  parseKg,
  prescription,
  restText,
  shortDate,
  variantsOf,
  videoUrl,
  weightStep,
} from '../../core/domain/format';
import { Exercise, ExerciseVariant } from '../../core/models/program.model';
import { PhotoStore } from '../../core/services/photo-store';
import { RestTimer } from '../../core/services/rest-timer';
import { CarnetStore } from '../../core/state/carnet.store';
import { Illustration } from '../../shared/illustration';

/**
 * La carte d'un exercice pendant la séance : schéma ou photo, séries à cocher, charge.
 * La carte se glisse horizontalement pour passer à une alternative quand la machine est prise.
 */
@Component({
  selector: 'app-exercise-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Illustration],
  templateUrl: './exercise-card.html',
})
export class ExerciseCard {
  private readonly store = inject(CarnetStore);
  private readonly timer = inject(RestTimer);
  protected readonly photos = inject(PhotoStore);

  readonly exercise = input.required<Exercise>();
  readonly sessionId = input.required<string>();
  /** Demande d'agrandir le schéma ou la photo d'une variante. */
  readonly zoom = output<ExerciseVariant>();
  /** Demande d'ouvrir la feuille « Photos » d'une variante. */
  readonly photo = output<ExerciseVariant>();

  private readonly carousel = viewChild.required<ElementRef<HTMLElement>>('carousel');
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly variants = computed(() => variantsOf(this.exercise()));
  protected readonly progress = computed(() =>
    this.store.progressOf(this.sessionId(), this.exercise().id),
  );
  protected readonly total = computed(() => this.exercise().sets + this.progress().extra);
  protected readonly setIndexes = computed(() => Array.from({ length: this.total() }, (_, i) => i));
  protected readonly done = computed(() =>
    this.exercise().sets ? this.progress().done >= this.exercise().sets : this.progress().done > 0,
  );
  protected readonly prescription = computed(() => prescription(this.exercise()));
  protected readonly rest = computed(() => restText(this.exercise().restSeconds));

  protected readonly formatKg = formatKg;
  protected readonly videoUrl = videoUrl;

  constructor() {
    // À l'affichage, on se place sur la variante utilisée la dernière fois.
    afterNextRender(() => {
      const element = this.carousel().nativeElement;
      const index = this.variants().findIndex(
        (v) => v.id === this.store.currentVariant(this.exercise()).id,
      );
      element.scrollLeft = Math.max(0, index) * element.clientWidth;
    });
  }

  protected weight(variant: ExerciseVariant): number {
    return this.store.weightOf(variant);
  }

  protected lastLog(variant: ExerciseVariant): string | null {
    const last = this.store.lastLog(variant.id);
    return last ? `${formatKg(last.weight)} ${variant.unit} · ${shortDate(last.date)}` : null;
  }

  /** Après un glissement, la variante affichée devient la variante choisie. */
  protected onScroll(): void {
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      const element = this.carousel().nativeElement;
      const variant = this.variants()[Math.round(element.scrollLeft / element.clientWidth)];
      if (variant) this.store.selectVariant(this.exercise(), variant.id);
    }, 120);
  }

  protected goTo(index: number): void {
    const element = this.carousel().nativeElement;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }

  protected toggleSet(index: number): void {
    const exercise = this.exercise();
    const result = this.store.toggleSet(this.sessionId(), exercise, index);
    if (result.increased && result.done < result.total) {
      this.timer.start(
        exercise.restSeconds || 60,
        this.store.currentVariant(exercise).name,
        `série ${result.done + 1}/${result.total} ensuite`,
      );
    } else if (result.done >= result.total) {
      this.timer.stop();
    }
  }

  protected addSet(): void {
    this.store.addExtraSet(this.sessionId(), this.exercise());
  }

  protected removeSet(): void {
    this.store.removeExtraSet(this.sessionId(), this.exercise());
  }

  protected toggleCardio(): void {
    this.store.toggleCardio(this.sessionId(), this.exercise().id);
  }

  protected bump(variant: ExerciseVariant, direction: 1 | -1): void {
    this.store.setWeight(
      variant.id,
      Math.max(0, this.weight(variant) + direction * weightStep(variant.unit)),
    );
  }

  protected typed(variant: ExerciseVariant, field: HTMLInputElement): void {
    const value = parseKg(field.value);
    if (value !== null) this.store.setWeight(variant.id, value);
    field.value = formatKg(this.weight(variant));
  }
}
