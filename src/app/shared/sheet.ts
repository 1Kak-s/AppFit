import { ChangeDetectionStrategy, Component, input, OnDestroy, output } from '@angular/core';

/** Feuille qui monte du bas de l'écran. Le contenu est fourni par le composant parent. */
@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div
      class="sheet"
      [class.tall]="tall()"
      role="dialog"
      aria-modal="true"
      (click)="onBackdrop($event)"
    >
      <div class="in"><ng-content /></div>
    </div>
  `,
})
export class Sheet implements OnDestroy {
  readonly tall = input(false);
  readonly closed = output<void>();

  constructor() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
