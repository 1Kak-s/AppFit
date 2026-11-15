import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  resource,
} from '@angular/core';
import qrcode from 'qrcode-generator';
import { plural } from '../../core/domain/format';
import { Program } from '../../core/models/program.model';
import { encodeProgram } from '../../core/services/share-codec';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { Sheet } from '../../shared/sheet';

const QR_MARGIN = 4;

/** Partage du programme : QR code, lien ou code à copier. Seul le programme part, jamais les charges ni les photos. */
@Component({
  selector: 'app-share-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet],
  template: `
    <app-sheet [tall]="true" (closed)="closed.emit()">
      <h4>Partager « {{ program().name }} »</h4>
      <p class="note" style="margin:0">
        {{ summary() }}. La personne garde ses propres charges, son historique et ses photos.
      </p>
      @if (share.value(); as s) {
        @if (s.qr) {
          <div class="qr">
            <svg
              [attr.viewBox]="'0 0 ' + s.qr.size + ' ' + s.qr.size"
              shape-rendering="crispEdges"
              role="img"
              aria-label="QR code du programme"
            >
              <rect [attr.width]="s.qr.size" [attr.height]="s.qr.size" fill="#fff" />
              <path [attr.d]="s.qr.path" fill="#000" />
            </svg>
          </div>
          <p class="note" style="margin:0;text-align:center">À scanner avec l'appareil photo</p>
        }
        @if (canShare) {
          <button type="button" class="opt" style="justify-content:center" (click)="send(s.link)">
            Envoyer le lien (Messages, WhatsApp…)
          </button>
        }
        <button
          type="button"
          class="opt"
          style="justify-content:center"
          (click)="ui.copy(s.link, 'Lien copié')"
        >
          Copier le lien
        </button>
        <div class="code">{{ s.code }}</div>
        <button
          type="button"
          class="opt"
          style="justify-content:center"
          (click)="ui.copy(s.code, 'Code copié')"
        >
          Copier le code
        </button>
      }
      <button type="button" class="cancel" (click)="closed.emit()">Fermer</button>
    </app-sheet>
  `,
})
export class ShareSheet {
  private readonly store = inject(CarnetStore);
  protected readonly ui = inject(UiFeedback);

  readonly program = input.required<Program>();
  readonly closed = output<void>();

  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly summary = computed(() => {
    const exercises = this.program().sessions.reduce((total, s) => total + s.exercises.length, 0);
    return `${plural(this.program().sessions.length, 'séance')}, ${plural(exercises, 'exercice')}`;
  });

  /** Le code est calculé de façon asynchrone (compression) : resource() gère l'attente. */
  protected readonly share = resource({
    params: () => this.program(),
    loader: async ({ params: program }) => {
      const code = await encodeProgram(program, this.store.userName());
      const link = `${location.origin}${location.pathname}#/importer/${code}`;
      return { code, link, qr: qrOf(link) };
    },
  });

  protected send(link: string): void {
    const from = this.store.userName() ? `${this.store.userName()} te partage` : 'Je te partage';
    const text = `${from} son programme de muscu « ${this.program().name} ». Ouvre le lien pour l'importer dans ton carnet.`;
    void navigator.share({ title: this.program().name, text, url: link }).catch(() => undefined);
  }
}

/** Le QR code sous forme d'un tracé SVG, ou null si le lien est trop long pour un QR code. */
function qrOf(value: string): { size: number; path: string } | null {
  try {
    const qr = qrcode(0, 'L');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) path += `M${col + QR_MARGIN} ${row + QR_MARGIN}h1v1h-1z`;
      }
    }
    return { size: count + QR_MARGIN * 2, path };
  } catch {
    return null;
  }
}
