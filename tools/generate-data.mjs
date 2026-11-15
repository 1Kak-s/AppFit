// Outil ponctuel : a servi à extraire les données (exercices, schémas, modèles) de l'ancienne page unique.
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8');
const start = html.indexOf("var YT=");
const end = html.indexOf('/* ---------- stockage ---------- */');
const code = html.slice(start, end) + '\n;({S,ALT,GROUP,GORDER,IMG,TPL,SPREAD,LIB})';
const d = vm.runInNewContext(code, { window: {}, Date, Math, String, Object });

// --- schémas : le balisage SVG devient une liste de formes typées (aucun HTML injecté dans la page)
const shapes = {};
for (const [key, markup] of Object.entries(d.IMG)) {
  const list = [];
  const rest = markup.replace(/<(path|circle|rect) ([^>]*)\/>/g, (_, tag, attrs) => {
    const a = Object.fromEntries([...attrs.matchAll(/([a-z]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    if (tag === 'path') list.push([a.class, a.d]);
    else if (tag === 'circle') list.push([a.class === 'h' ? 'h' : 'c', +a.cx, +a.cy, +a.r]);
    else list.push(['r', +a.x, +a.y, +a.width, +a.height, +a.rx]);
    return '';
  });
  const rest2 = rest.replace(/<text class="lb" x="([^"]*)" y="([^"]*)">([^<]*)<\/text>/g, (_, x, y, label) => { list.push(['t', +x, +y, label]); return ''; });
  if (rest2.trim()) throw new Error('balisage inattendu dans ' + key + ': ' + rest2.slice(0, 80));
  shapes[key] = list;
}
const kinds = new Set(Object.values(shapes).flat().map(s => s[0]));
console.log('formes:', [...kinds].join(','), 'schémas:', Object.keys(shapes).length);
let out = `// Fichier généré par tools/generate-data.mjs. Chaque schéma est une liste de formes dessinées par IllustrationComponent.
export type PathShape = readonly ['p' | 'm' | 'mf' | 'ar' | 'ah', string];
export type CircleShape = readonly ['h' | 'c', number, number, number];
export type RectShape = readonly ['r', number, number, number, number, number];
export type TextShape = readonly ['t', number, number, string];
export type Shape = PathShape | CircleShape | RectShape | TextShape;

export const GENERIC_ILLUSTRATION = 'gen';

export const ILLUSTRATIONS: Readonly<Record<string, readonly Shape[]>> = {\n`;
for (const [k, l] of Object.entries(shapes)) out += `  ${JSON.stringify(k)}: ${JSON.stringify(l)},\n`;
out += '};\n';
fs.writeFileSync('src/app/core/data/illustrations.data.ts', out);

// --- bibliothèque d'exercices
const lib = d.LIB.map(L => ({ key: L.key, group: L.g, name: L.n, machineLabel: L.m || '', muscles: L.mu || '', sets: L.sets, reps: L.reps, restSeconds: L.rest, startWeight: L.kg, unit: L.u, videoQuery: L.v, photoQuery: L.q, illustration: L.img, alternativeKeys: L.alts }));
let o2 = `// Fichier généré par tools/generate-data.mjs à partir du programme d'origine.
import { WeightUnit } from '../models/program.model';

export interface LibraryEntry {
  readonly key: string;
  readonly group: string;
  readonly name: string;
  readonly machineLabel: string;
  readonly muscles: string;
  readonly sets: number;
  readonly reps: string;
  readonly restSeconds: number;
  readonly startWeight: number;
  readonly unit: WeightUnit;
  readonly videoQuery: string;
  readonly photoQuery: string;
  readonly illustration: string;
  readonly alternativeKeys: readonly string[];
}

export const MUSCLE_GROUPS: readonly string[] = ${JSON.stringify(d.GORDER)};

export const LIBRARY: readonly LibraryEntry[] = [\n`;
for (const L of lib) o2 += '  ' + JSON.stringify(L) + ',\n';
o2 += `];\n\nexport const LIBRARY_BY_KEY: ReadonlyMap<string, LibraryEntry> = new Map(LIBRARY.map((entry) => [entry.key, entry]));\n`;
fs.writeFileSync('src/app/core/data/library.data.ts', o2);

// --- modèles de programmes
const dayOf = { A: 6, B: 0, C: 1 };
const onAir = ['A', 'B', 'C'].map(k => ({ legacyId: k, name: d.S[k].name, day: dayOf[k], warmup: d.S[k].warm, duration: d.S[k].dur, exerciseKeys: d.S[k].ex.map(e => e.id) }));
const ready = Object.fromEntries(Object.entries(d.TPL).map(([n, T]) => [n, { name: T.name, description: T.desc, days: T.days ?? null, sessions: T.s.map(x => ({ name: x[0], exerciseKeys: x[1] })) }]));
let o3 = `// Fichier généré par tools/generate-data.mjs.
export interface OnAirSession {
  readonly legacyId: string;
  readonly name: string;
  readonly day: number;
  readonly warmup: string;
  readonly duration: string;
  readonly exerciseKeys: readonly string[];
}

export interface ReadyProgram {
  readonly name: string;
  readonly description: string;
  readonly days: readonly (readonly number[])[] | null;
  readonly sessions: readonly { readonly name: string; readonly exerciseKeys: readonly string[] }[];
}

/** Le programme d'origine, « Machines en 3 séances ». */
export const ON_AIR_SESSIONS: readonly OnAirSession[] = ${JSON.stringify(onAir, null, 2)};

/** Programmes prêts à l'emploi, par nombre de jours d'entraînement par semaine. */
export const READY_PROGRAMS: Readonly<Record<number, ReadyProgram>> = ${JSON.stringify(ready, null, 2)};

/** Répartition par défaut des séances dans la semaine (0 = dimanche). */
export const WEEK_SPREAD: Readonly<Record<number, readonly (readonly number[])[]>> = ${JSON.stringify(d.SPREAD)};
`;
fs.writeFileSync('src/app/core/data/templates.data.ts', o3);
console.log('bibliothèque:', lib.length, 'entrées');
