import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { daysText, photoQueryOf, photoSearchUrl } from '../../core/domain/format';
import { ExerciseVariant } from '../../core/models/program.model';
import { PhotoStore } from '../../core/services/photo-store';
import { RestTimer } from '../../core/services/rest-timer';
import { UiFeedback } from '../../core/services/ui-feedback';
import { CarnetStore } from '../../core/state/carnet.store';
import { Illustration } from '../../shared/illustration';
import { Sheet } from '../../shared/sheet';
import { ExerciseCard } from './exercise-card';

/** L'écran principal : la séance du jour, exercice par exercice. */
@Component({
  selector: 'app-session-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ExerciseCard, Illustration, Sheet],
  templateUrl: './session.page.html',
  host: { '(document:keydown.escape)': 'zoomed.set(null)' },
})
export class SessionPage {
  protected readonly store = inject(CarnetStore);
  protected readonly photos = inject(PhotoStore);
  private readonly timer = inject(RestTimer);
  private readonly ui = inject(UiFeedback);
  private readonly router = inject(Router);

  private readonly chosenId = signal<string | null>(null);
  protected readonly confirmingReset = signal(false);
  protected readonly zoomed = signal<ExerciseVariant | null>(null);
  protected readonly photoFor = signal<ExerciseVariant | null>(null);
  protected readonly photoError = signal('');

  protected readonly today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  protected readonly daysText = daysText;
  protected readonly photoSearchUrl = photoSearchUrl;
  protected readonly photoQueryOf = photoQueryOf;

  /** La séance affichée : celle choisie, sinon celle prévue aujourd'hui, sinon la première. */
  protected readonly session = computed(
    () =>
      this.store.session(this.chosenId()) ??
      this.store.todaySession() ??
      this.store.sessions()[0] ??
      null,
  );
  protected readonly color = computed(() =>
    this.session() ? this.store.colorOf(this.session()!.id) : 'var(--muted)',
  );
  protected readonly doneCount = computed(() => {
    const session = this.session();
    if (!session) return 0;
    return session.exercises.filter((e) => {
      const done = this.store.progressOf(session.id, e.id).done;
      return e.sets ? done >= e.sets : done > 0;
    }).length;
  });
  protected readonly percent = computed(() => {
    const count = this.session()?.exercises.length ?? 0;
    return count ? Math.round((this.doneCount() / count) * 100) : 0;
  });

  protected choose(sessionId: string): void {
    this.chosenId.set(sessionId);
    this.confirmingReset.set(false);
  }

  protected reset(): void {
    this.store.resetSession(this.session()!.id);
    this.confirmingReset.set(false);
    this.timer.stop();
  }

  protected finish(): void {
    this.store.finishSession(this.session()!.id);
    this.timer.stop();
    void this.router.navigate(['/progres']);
  }

  protected openPhotoSheet(variant: ExerciseVariant): void {
    this.photoError.set('');
    this.photoFor.set(variant);
  }

  protected async addPhoto(variant: ExerciseVariant, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const saved = await this.photos.set(variant.id, await this.photos.fromFile(file));
      this.photoFor.set(null);
      if (!saved)
        void this.ui.inform(
          'Photo affichée, mais ce navigateur ne peut pas la garder après fermeture.',
        );
    } catch {
      this.photoError.set('Impossible de lire cette image. Essaie avec une photo JPEG ou PNG.');
    }
  }

  protected async removePhoto(variant: ExerciseVariant): Promise<void> {
    await this.photos.remove(variant.id);
    this.photoFor.set(null);
  }
}
