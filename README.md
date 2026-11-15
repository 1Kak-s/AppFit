# Carnet · Muscu (Angular)

Carnet de musculation installable sur téléphone (PWA) : séances, charges, minuteur de repos,
programmes partageables par lien ou QR code, et un coach IA (via le backend `carnet-coach-api`).
Les données restent sur le téléphone.

## Démarrer

```bash
npm install
npm start          # http://localhost:4200
npm test           # tests unitaires (Vitest)
npm run build      # version de production dans dist/carnet-web/browser
```

Pour tester le coach en local, lance le backend en mode démo (`dotnet run --Ai:Provider=Fake`
dans `carnet-coach-api/src/CarnetCoach.Api`) puis colle `http://localhost:5080` dans Réglages, rubrique Coach.

## Mise en ligne (GitHub Pages)

1. Pousse ce dossier dans un dépôt GitHub.
2. Settings > Pages > Source : « GitHub Actions ».
3. Chaque push sur `main` lance les tests, compile et met en ligne (`.github/workflows/deploy.yml`).

L'adresse du coach se règle dans `public/config.json`, sans recompiler :

```json
{ "coachUrl": "https://ton-coach.example.com" }
```

## Architecture

```
src/app
  app.ts, app.html        Le cadre : écran courant, minuteur de repos, onglets, messages
  app.routes.ts           Les écrans, chargés à la demande, et les gardes (carnet créé ou non)
  app.config.ts           Routeur, HttpClient, service worker, initialisation
  core/                   Tout ce qui n'est pas de l'affichage
    models/               Types : programme, état du carnet, coach
    data/                 Bibliothèque d'exercices, schémas, programmes prêts (générés par tools/)
    domain/               Fonctions pures : formatage, fabrication de programmes, identifiants
    validation/           Vérification de toute donnée venue de l'extérieur
    legacy/               Reprise des données des versions précédentes
    state/                CarnetStore (signals) et stockage sur le téléphone
    services/             Photos, minuteur, écran allumé, partage, sauvegarde, configuration
    security/             Politique Trusted Types
  shared/                 Composants réutilisables : feuille du bas, schéma de machine
  features/               Un dossier par écran : welcome, session, progress, program, coach, settings
```

Principes :

- **Une seule source de vérité** : `CarnetStore` expose l'état en signals en lecture seule. Les écrans ne
  modifient rien directement ; chaque changement passe par une méthode du store, qui l'enregistre aussitôt.
- **Composants standalone, OnPush, signals**, syntaxe `@if` / `@for`, `input()` / `output()`.
- **Fonctions pures dans `domain/`**, faciles à tester sans Angular.

## Sécurité

- **Politique de sécurité du contenu stricte** (`src/index.html`) : seuls les scripts de l'app s'exécutent,
  aucun script en ligne, aucune ressource externe. Les polices sont servies par l'app elle-même.
- **Trusted Types** activés : aucune chaîne ne peut devenir du HTML ou un script. La seule exception est
  l'enregistrement du service worker, limitée à ce fichier précis (`core/security/trusted-types.ts`).
- **Aucun `innerHTML`** : les schémas des machines sont des listes de formes dessinées par le gabarit.
- **Tout ce qui entre est vérifié** (`core/validation/sanitize.ts`) : lien de partage, sauvegarde,
  réponse du coach, et même le stockage local. Types, longueurs, nombres d'éléments et identifiants sont
  bornés ; les clés dangereuses (`__proto__`...) sont écartées ; les photos doivent être des images encodées.
- **Adresse du coach** : HTTPS obligatoire (sauf `localhost` pour développer), sans identifiants dans l'URL.
- **Clé de l'IA** : jamais dans l'app. Elle reste dans le backend.
- **Photos** : réencodées à l'import, ce qui retire les métadonnées (lieu, appareil). Elles ne quittent
  pas le téléphone, sauf dans une sauvegarde exportée par la personne.
- **Liens externes** en `noopener noreferrer`, et `referrer` désactivé sur toute l'app.
- **Dépendances** : `npm audit` dans le déploiement ; un seul paquet tiers à l'exécution (`qrcode-generator`).

Pour aller plus loin une fois le backend en ligne : dans `index.html`, remplace `https:` dans
`connect-src` par l'adresse exacte du coach.
