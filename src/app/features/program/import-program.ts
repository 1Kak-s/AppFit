import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { plural } from '../../core/domain/format';
import { decodeProgram, extractCode, SharedProgram } from '../../core/services/share-codec';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { Sheet } from '../../shared/sheet';

/** Import d'un programme partagé : on colle le lien ou le code, on voit un aperçu, puis on l'ajoute. */
@Component({
  selector: 'app-import-program',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet],
  template: `
    <app-sheet [tall]="true" (closed)="closed.emit()">
      @if (shared(); as s) {
        <h4>{{ s.program.name }}</h4>
        <p style="margin:0;font-size:14px;line-height:1.5">
          {{ s.from ? s.from + ' te partage ce programme : ' : 'Programme partagé : '
          }}{{ summary() }}.
        </p>
        <p class="note" style="margin:0">{{ sessionNames() }}</p>
        @if (!store.hasProfile()) {
          <label class="fld" style="margin-top:6px"
            >Ton prénom
            <input
              #name
              [value]="firstRunName()"
              maxlength="40"
              placeholder="Ex. Léa"
              (input)="userName.set(name.value)"
            />
          </label>
        }
        <button
          type="button"
          class="opt"
          style="justify-content:center;background:var(--accent);color:var(--accent-ink);border-color:var(--accent)"
          (click)="add(true)"
        >
          Importer et l'utiliser
        </button>
        @if (store.hasProfile()) {
          <button type="button" class="opt" style="justify-content:center" (click)="add(false)">
            Importer sans changer de programme
          </button>
        }
      } @else {
        <h4>Importer un programme</h4>
        <p class="note" style="margin:0">Colle le lien ou le code qu'on t'a envoyé.</p>
        <textarea
          #pasted
          class="paste"
          placeholder="https://…  ou  Z…"
          aria-label="Lien ou code"
          maxlength="70000"
        ></textarea>
        @if (error()) {
          <p class="err">{{ error() }}</p>
        }
        <button
          type="button"
          class="opt"
          style="justify-content:center"
          (click)="read(pasted.value)"
        >
          Continuer
        </button>
      }
      <button type="button" class="cancel" (click)="closed.emit()">Annuler</button>
    </app-sheet>
  `,
})
export class ImportProgram {
  protected readonly store = inject(CarnetStore);
  private readonly router = inject(Router);
  private readonly ui = inject(UiFeedback);

  /** Code déjà connu (ouverture par un lien) : l'aperçu s'affiche directement. */
  readonly code = input<string | null>(null);
  readonly firstRunName = input('');
  readonly closed = output<void>();

  protected readonly shared = signal<SharedProgram | null>(null);
  protected readonly error = signal('');
  protected readonly userName = signal<string | null>(null);
  protected readonly summary = computed(() => {
    const program = this.shared()!.program;
    const exercises = program.sessions.reduce((total, s) => total + s.exercises.length, 0);
    return `${plural(program.sessions.length, 'séance')}, ${plural(exercises, 'exercice')}`;
  });
  protected readonly sessionNames = computed(() =>
    this.shared()!
      .program.sessions.map((s) => s.name)
      .join(' · '),
  );

  constructor() {
    effect(() => {
      const code = this.code();
      if (code) void this.read(code);
    });
  }

  protected async read(pasted: string): Promise<void> {
    const code = extractCode(pasted);
    if (!code) {
      this.error.set('Je ne trouve pas de code dans ce texte.');
      return;
    }
    try {
      this.shared.set(await decodeProgram(code));
    } catch {
      this.error.set('Ce code est incomplet ou abîmé. Demande à la personne de le renvoyer.');
    }
  }

  protected add(activate: boolean): void {
    const program = this.shared()!.program;
    if (!this.store.hasProfile())
      this.store.createProfile(
        (this.userName() ?? this.firstRunName()).trim().slice(0, 40),
        program,
      );
    else if (!this.store.addProgram(program, activate)) {
      this.ui.toast('Trop de programmes : supprimes-en un avant.');
      return;
    }
    this.closed.emit();
    void this.router.navigate([activate ? '/seance' : '/programme']);
    this.ui.toast('Programme importé');
  }
}
