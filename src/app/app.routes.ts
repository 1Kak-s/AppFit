import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { CarnetStore } from './core/state/carnet.store';

/** Les écrans de l'app demandent un carnet déjà créé ; sinon, direction l'accueil. */
const hasProfile: CanActivateFn = () =>
  inject(CarnetStore).hasProfile() || inject(Router).parseUrl('/bienvenue');
const noProfile: CanActivateFn = () =>
  !inject(CarnetStore).hasProfile() || inject(Router).parseUrl('/seance');

/** Chaque écran est chargé à la demande : le premier affichage ne télécharge que ce qu'il utilise. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'seance' },
  {
    path: 'bienvenue',
    canActivate: [noProfile],
    loadComponent: () => import('./features/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'importer/:code',
    loadComponent: () =>
      import('./features/program/import-link.page').then((m) => m.ImportLinkPage),
  },
  {
    path: '',
    canActivate: [hasProfile],
    children: [
      {
        path: 'seance',
        loadComponent: () => import('./features/session/session.page').then((m) => m.SessionPage),
      },
      {
        path: 'progres',
        loadComponent: () =>
          import('./features/progress/progress.page').then((m) => m.ProgressPage),
      },
      {
        path: 'programme',
        loadComponent: () => import('./features/program/program.page').then((m) => m.ProgramPage),
      },
      {
        path: 'programme/seance/:sessionId',
        loadComponent: () =>
          import('./features/program/session-editor.page').then((m) => m.SessionEditorPage),
      },
      {
        path: 'programme/seance/:sessionId/exercice/:exerciseId',
        loadComponent: () =>
          import('./features/program/exercise-editor.page').then((m) => m.ExerciseEditorPage),
      },
      {
        path: 'programme/seance/:sessionId/exercice/:exerciseId/alternative/:alternativeId',
        loadComponent: () =>
          import('./features/program/alternative-editor.page').then((m) => m.AlternativeEditorPage),
      },
      {
        path: 'coach',
        loadComponent: () => import('./features/coach/coach.page').then((m) => m.CoachPage),
      },
      {
        path: 'reglages',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'seance' },
];
