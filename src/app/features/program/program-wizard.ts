import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { plural } from '../../core/domain/format';
import {
  blankProgram,
  duplicateProgram,
  readyProgram,
  templateSummary,
} from '../../core/domain/program-factory';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { Sheet } from '../../shared/sheet';

/** Assistant « nouveau programme » : nombre de jours par semaine, puis programme prêt à l'emploi ou séances vides. */
@Component({
  selector: 'app-program-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet],
  template: `
    <app-sheet [tall]="true" (closed)="closed.emit()">
      <h4>Combien de jours par semaine ?</h4>
      <div class="nd">
        @for (n of dayChoices; track n) {
          <button type="button" [attr.aria-pressed]="n === days()" (click)="days.set(n)">
            {{ n }}
          </button>
        }
      </div>
      <div class="wz">
        @if (template(); as t) {
          <button type="button" class="opt" (click)="create('ready')">
            <span
              >Programme prêt : {{ t.name }}<small>{{ t.description }}</small
              ><small style="color:var(--fg);margin-top:4px">{{ t.sessions }}</small></span
            >
          </button>
        }
        <button type="button" class="opt" (click)="create('blank')">
          <span
            >{{ sessionsLabel() }} à remplir<small
              >Jours déjà placés dans la semaine, exercices à choisir dans la bibliothèque</small
            ></span
          >
        </button>
        <p class="note" style="margin:0">
          Tout reste modifiable ensuite : noms, jours, exercices, séries.
        </p>
      </div>
      @if (store.activeProgram(); as current) {
        <button type="button" class="opt" style="justify-content:center" (click)="create('copy')">
          Copie de « {{ current.name }} »
        </button>
      }
      <button type="button" class="cancel" (click)="closed.emit()">Annuler</button>
    </app-sheet>
  `,
})
export class ProgramWizard {
  protected readonly store = inject(CarnetStore);
  private readonly router = inject(Router);
  private readonly ui = inject(UiFeedback);

  /** Prénom saisi sur l'écran d'accueil, utilisé si le carnet n'existe pas encore. */
  readonly firstRunName = input('');
  readonly closed = output<void>();

  protected readonly dayChoices = [1, 2, 3, 4, 5, 6, 7];
  protected readonly days = signal(3);
  protected readonly template = computed(() => templateSummary(this.days()));
  protected readonly sessionsLabel = computed(() => plural(this.days(), 'séance'));

  protected create(kind: 'ready' | 'blank' | 'copy'): void {
    const current = this.store.activeProgram();
    const program =
      kind === 'ready'
        ? readyProgram(this.days())
        : kind === 'blank'
          ? blankProgram(this.days())
          : duplicateProgram(current!, `${current!.name} (copie)`);

    if (!this.store.hasProfile()) this.store.createProfile(this.firstRunName(), program);
    else if (!this.store.addProgram(program, true)) {
      this.ui.toast('Trop de programmes : supprimes-en un avant.');
      return;
    }

    this.closed.emit();
    if (kind === 'blank') {
      void this.router.navigate(['/programme/seance', program.sessions[0]!.id]);
      this.ui.toast('Ajoute les exercices de chaque séance');
    } else {
      void this.router.navigate([kind === 'ready' ? '/seance' : '/programme']);
      this.ui.toast('Programme créé');
    }
  }
}
