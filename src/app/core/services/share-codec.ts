/**
 * Partage d'un programme par lien, QR code ou code.
 * Le programme est réduit au strict nécessaire (un exercice de la bibliothèque n'est envoyé que par sa clé
 * et ce qui a été modifié), compressé, puis écrit en base64 « URL ». Le format est celui du Carnet v2,
 * pour que les liens déjà envoyés restent valables.
 * À la lecture, rien n'est cru sur parole : le résultat passe par sanitizeProgram.
 */
import { LIBRARY_BY_KEY, LibraryEntry } from '../data/library.data';
import { Program } from '../models/program.model';
import { asRecord, sanitizeProgram, text } from '../validation/sanitize';

type Field = readonly [name: string, omitWhen: unknown, short: string];
type Bag = Record<string, unknown>;

const VARIANT_FIELDS: readonly Field[] = [
  ['name', null, 'n'],
  ['machineLabel', null, 'm'],
  ['muscles', null, 'mu'],
  ['startWeight', 0, 'kg'],
  ['unit', 'kg', 'u'],
  ['videoQuery', null, 'v'],
  ['photoQuery', null, 'q'],
  ['illustration', 'gen', 'i'],
];
const EXERCISE_FIELDS: readonly Field[] = [
  ...VARIANT_FIELDS,
  ['sets', null, 's'],
  ['reps', null, 'r'],
  ['restSeconds', 0, 're'],
];
const MAX_CODE_LENGTH = 60_000;

export interface SharedProgram {
  from: string;
  program: Program;
}

export async function encodeProgram(program: Program, from: string): Promise<string> {
  const payload = {
    t: 'cp',
    v: 2,
    from,
    p: {
      n: program.name,
      s: program.sessions.map((session) => {
        const s: Bag = {
          n: session.name,
          x: session.exercises.map((e) => ({
            ...packItem(e as unknown as Bag, EXERCISE_FIELDS),
            ...(e.alternatives.length
              ? { a: e.alternatives.map((a) => packItem(a as unknown as Bag, VARIANT_FIELDS)) }
              : {}),
          })),
        };
        if (session.days.length) s['d'] = session.days;
        if (session.warmup) s['w'] = session.warmup;
        if (session.duration) s['du'] = session.duration;
        return s;
      }),
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if ('CompressionStream' in globalThis) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'Z' + toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
    } catch {
      // Compression indisponible : on envoie le JSON tel quel.
    }
  }
  return 'J' + toBase64Url(bytes);
}

/** Lève une erreur si le code est illisible ou ne contient pas un programme. */
export async function decodeProgram(code: string): Promise<SharedProgram> {
  if (code.length > MAX_CODE_LENGTH) throw new Error('Code trop long');
  const bytes = fromBase64Url(code.slice(1));
  let json: string;
  if (code[0] === 'J') {
    json = new TextDecoder().decode(bytes);
  } else if (code[0] === 'Z' && 'DecompressionStream' in globalThis) {
    const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    json = await new Response(stream).text();
  } else {
    throw new Error('Format de code inconnu');
  }

  const data = asRecord(JSON.parse(json));
  const p = asRecord(data?.['p']);
  if (!data || data['t'] !== 'cp' || !p || !Array.isArray(p['s']))
    throw new Error('Ce code ne contient pas de programme');

  const draft = {
    name: p['n'] ?? 'Programme reçu',
    updatedAt: Date.now(),
    sessions: p['s'].map((value) => {
      const s = asRecord(value) ?? {};
      return {
        name: s['n'],
        days: s['d'],
        warmup: s['w'],
        duration: s['du'],
        exercises: (Array.isArray(s['x']) ? s['x'] : []).map((x) => {
          const item = asRecord(x) ?? {};
          return {
            ...unpackItem(item, EXERCISE_FIELDS),
            alternatives: (Array.isArray(item['a']) ? item['a'] : []).map((a) =>
              unpackItem(asRecord(a) ?? {}, VARIANT_FIELDS),
            ),
          };
        }),
      };
    }),
  };
  // Les identifiants sont volontairement absents : sanitizeProgram en crée de nouveaux.
  const program = sanitizeProgram(draft);
  if (!program) throw new Error('Programme invalide');
  return { from: text(data['from'], 40), program };
}

/** Retrouve le code dans ce que la personne a collé : un lien complet ou le code seul. */
export function extractCode(pasted: string): string | null {
  const input = pasted.trim();
  const fromLink = input.match(/#\/?(?:p=|importer\/)([A-Za-z0-9_-]+)/);
  if (fromLink) return fromLink[1]!;
  return input.match(/[ZJ][A-Za-z0-9_-]{16,}/)?.[0] ?? null;
}

function packItem(item: Bag, fields: readonly Field[]): Bag {
  const base = LIBRARY_BY_KEY.get(item['illustration'] as string) as unknown as
    (LibraryEntry & Bag) | undefined;
  const out: Bag = {};
  for (const [name, omitWhen, short] of fields) {
    const value = item[name];
    if (base) {
      if (value !== base[name]) out[short] = value ?? '';
    } else if (value != null && value !== '' && value !== omitWhen) {
      out[short] = value;
    }
  }
  if (base) {
    out['k'] = item['illustration'];
    delete out['i'];
  }
  return out;
}

function unpackItem(packed: Bag, fields: readonly Field[]): Bag {
  const key = typeof packed['k'] === 'string' ? packed['k'] : '';
  const base = LIBRARY_BY_KEY.get(key) as unknown as (LibraryEntry & Bag) | undefined;
  const out: Bag = {};
  for (const [name, omitWhen, short] of fields) {
    out[name] = packed[short] ?? (base ? base[name] : (omitWhen ?? ''));
  }
  if (base) out['illustration'] = key;
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error('Code invalide');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
