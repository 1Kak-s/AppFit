import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
  withInMemoryScrolling,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { AppConfig } from './core/services/app-config';
import { PhotoStore } from './core/services/photo-store';
import { WakeLock } from './core/services/wake-lock';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Adresses en « #/... » : l'app fonctionne sur un hébergement de fichiers statiques comme GitHub Pages.
    provideRouter(
      routes,
      withHashLocation(),
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withFetch()),
    // Hors connexion : l'app est mise en cache par un service worker, en production seulement.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(AppConfig).load()),
    provideAppInitializer(() => {
      inject(WakeLock);
      void inject(PhotoStore).init();
    }),
  ],
};
