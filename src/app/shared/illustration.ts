import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { GENERIC_ILLUSTRATION, ILLUSTRATIONS, Shape } from '../core/data/illustrations.data';

interface Drawn {
  kind: 'path' | 'circle' | 'rect' | 'text';
  cssClass: string;
  d?: string;
  x?: number;
  y?: number;
  r?: number;
  width?: number;
  height?: number;
  label?: string;
}

/**
 * Dessine le schéma d'une machine à l'intérieur d'une balise <svg>.
 * Les formes viennent d'une table de constantes et sont posées une à une par le gabarit :
 * aucun HTML n'est injecté, même si la clé du schéma vient d'un programme importé.
 */
@Component({
  selector: 'svg[appIllustration]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (shape of shapes(); track $index) {
      @switch (shape.kind) {
        @case ('path') {
          <svg:path [attr.class]="shape.cssClass" [attr.d]="shape.d" />
        }
        @case ('circle') {
          <svg:circle
            [attr.class]="shape.cssClass"
            [attr.cx]="shape.x"
            [attr.cy]="shape.y"
            [attr.r]="shape.r"
          />
        }
        @case ('rect') {
          <svg:rect
            class="mf"
            [attr.x]="shape.x"
            [attr.y]="shape.y"
            [attr.width]="shape.width"
            [attr.height]="shape.height"
            [attr.rx]="shape.r"
          />
        }
        @case ('text') {
          <svg:text class="lb" [attr.x]="shape.x" [attr.y]="shape.y">{{ shape.label }}</svg:text>
        }
      }
    }
  `,
})
export class Illustration {
  /** Clé du schéma ; une clé inconnue affiche le schéma générique. */
  readonly appIllustration = input.required<string>();

  protected readonly shapes = computed(() =>
    (ILLUSTRATIONS[this.appIllustration()] ?? ILLUSTRATIONS[GENERIC_ILLUSTRATION]!).map(toDrawn),
  );
}

function toDrawn(shape: Shape): Drawn {
  switch (shape[0]) {
    case 'h':
      return { kind: 'circle', cssClass: 'h', x: shape[1], y: shape[2], r: shape[3] };
    case 'c':
      return { kind: 'circle', cssClass: 'mf', x: shape[1], y: shape[2], r: shape[3] };
    case 'r':
      return {
        kind: 'rect',
        cssClass: 'mf',
        x: shape[1],
        y: shape[2],
        width: shape[3],
        height: shape[4],
        r: shape[5],
      };
    case 't':
      return { kind: 'text', cssClass: 'lb', x: shape[1], y: shape[2], label: shape[3] };
    default:
      return { kind: 'path', cssClass: shape[0], d: shape[1] };
  }
}
