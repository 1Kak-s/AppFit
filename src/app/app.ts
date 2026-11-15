import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RestTimer } from './core/services/rest-timer';
import { UiFeedback } from './core/services/ui-feedback';
import { CarnetStore } from './core/state/carnet.store';
import { Sheet } from './shared/sheet';

/** Le cadre de l'app : l'écran en cours, le minuteur de repos, les onglets et les messages brefs. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sheet],
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(CarnetStore);
  protected readonly timer = inject(RestTimer);
  protected readonly ui = inject(UiFeedback);

  protected readonly tabs = [
    { path: '/seance', label: 'Séance', icon: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12' },
    { path: '/progres', label: 'Progrès', icon: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-6' },
    {
      path: '/programme',
      label: 'Programme',
      icon: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
    },
    { path: '/coach', label: 'Coach', icon: 'M4 5h16v11H10l-5 4v-4H4zM8.5 9.5h7M8.5 12.5h4' },
    {
      path: '/reglages',
      label: 'Réglages',
      icon: 'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
    },
  ] as const;
}
