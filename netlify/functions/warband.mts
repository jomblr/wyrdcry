/**
 * Shared warband links for the Warband Builder.
 *
 * A warband is only stored here when someone presses "Share link". Each press stores a fresh
 * snapshot under a new short id (the /w/:id link, see warband-page.mts), so a link never changes once made and
 * nobody can overwrite anyone else's warband. Opening a link imports a copy. Remove a link by
 * hand in the Netlify dashboard if needed.
 *
 *   POST /api/warband      { warband }  → { id }
 *   GET  /api/warband/:id               → { warband }
 *
 * An unknown id answers 410 rather than 404: `netlify dev` retries 404s as other paths
 * (…/index.html) to mimic static files.
 *
 * Browse what's been shared in the Netlify dashboard (Blobs → "warbands") or with
 * `netlify blobs:list warbands`.
 */
import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

interface StoredWarband {
  warband: Record<string, unknown>;
  createdAt: string;
}

const MAX_BODY_BYTES = 64 * 1024;
const ID_LENGTH = 8;
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_PATTERN = /^[A-Za-z0-9]{8}$/;

const json = (body: unknown, status = 200) => Response.json(body, { status });
const error = (message: string, status: number) => json({ error: message }, status);

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  // 256 % 62 leaves a slight bias towards the first few characters; fine for an id.
  return Array.from(bytes, b => ID_CHARS[b % ID_CHARS.length]).join('');
}

/** The warband from a request body, without its local id, or an error response. */
async function readWarband(req: Request): Promise<Record<string, unknown> | Response> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return error('Warband is too large', 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error('Body is not valid JSON', 400);
  }
  const warband = (body as { warband?: unknown } | null)?.warband;
  if (!warband || typeof warband !== 'object' || Array.isArray(warband)) return error('Missing warband', 400);
  const wb = warband as Record<string, unknown>;
  if (!Array.isArray(wb.fighters)) return error('Warband has no fighter list', 400);
  if (wb.factionId !== null && typeof wb.factionId !== 'string') return error('Warband has no faction', 400);
  const { id: _localId, ...rest } = wb;
  return rest;
}

export default async (req: Request, context: Context) => {
  // Strong reads so a link opened right after sharing (and the id-taken check) sees the new entry
  const store = getStore({ name: 'warbands', consistency: 'strong' });
  const id = context.params.id;

  if (!id) {
    if (req.method !== 'POST') return error('Method not allowed', 405);
    const warband = await readWarband(req);
    if (warband instanceof Response) return warband;
    let newId = randomId();
    for (let tries = 0; (await store.get(newId)) !== null; tries++) {
      if (tries >= 5) return error('Could not create a link, try again', 503);
      newId = randomId();
    }
    const record: StoredWarband = { warband, createdAt: new Date().toISOString() };
    await store.setJSON(newId, record);
    return json({ id: newId }, 201);
  }

  if (req.method !== 'GET') return error('Method not allowed', 405);
  if (!ID_PATTERN.test(id)) return error('No such warband link', 410);
  const record = (await store.get(id, { type: 'json' })) as StoredWarband | null;
  if (!record) return error('No such warband link', 410);
  return json({ warband: record.warband });
};

export const config: Config = {
  path: '/api/warband/:id?',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
