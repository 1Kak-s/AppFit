/**
 * Trusted Types : la politique de sécurité de la page (index.html) interdit de charger un script
 * à partir d'une simple chaîne de caractères. Angular a sa propre politique pour ses besoins ;
 * il ne reste qu'un cas à autoriser, l'enregistrement du service worker (mode hors connexion).
 *
 * La politique « default » ci-dessous n'accepte que ce fichier précis, sur ce site.
 * Toute autre adresse de script est refusée.
 */
interface TrustedTypesFactory {
  createPolicy(name: string, rules: { createScriptURL?: (input: string) => string }): unknown;
}

const SERVICE_WORKER = '/ngsw-worker.js';

export function installTrustedTypesPolicy(): void {
  const factory = (globalThis as { trustedTypes?: TrustedTypesFactory }).trustedTypes;
  if (!factory) return;
  factory.createPolicy('default', {
    createScriptURL: (input) => {
      const url = new URL(input, document.baseURI);
      if (
        url.origin === location.origin &&
        url.pathname.endsWith(SERVICE_WORKER) &&
        !url.search &&
        !url.hash
      )
        return input;
      throw new TypeError(`Adresse de script refusée : ${input}`);
    },
  });
}
