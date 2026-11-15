import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { installTrustedTypesPolicy } from './app/core/security/trusted-types';

/** Les anciens liens de partage (« #p=CODE ») sont réécrits vers la route actuelle avant le démarrage du routeur. */
function redirectLegacyShareLink(): void {
  const legacy = location.hash.match(/^#p=([A-Za-z0-9_-]+)$/);
  if (legacy) location.replace(`${location.pathname}${location.search}#/importer/${legacy[1]}`);
}

installTrustedTypesPolicy();
redirectLegacyShareLink();
window.addEventListener('hashchange', redirectLegacyShareLink);

bootstrapApplication(App, appConfig).catch((error) => console.error(error));
