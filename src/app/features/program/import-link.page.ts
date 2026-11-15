import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ImportProgram } from './import-program';

/** Arrivée par un lien de partage (« #/importer/CODE ») : affiche directement l'aperçu du programme. */
@Component({
  selector: 'app-import-link-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImportProgram],
  template: `<app-import-program [code]="code()" (closed)="leave()" />`,
})
export class ImportLinkPage {
  private readonly router = inject(Router);

  /** Paramètre de route. */
  readonly code = input.required<string>();

  protected leave(): void {
    // Si l'import a déjà mené ailleurs, on ne touche à rien ; sinon retour à l'app.
    if (this.router.url.startsWith('/importer')) void this.router.navigate(['/']);
  }
}
