/**
 * Share links for warbands (see netlify/functions/warband.mts). A warband is uploaded only when
 * someone presses "Share link", and every press makes a new link holding the warband as it is
 * then. Links never change; whoever opens one imports a copy.
 */
import type { Warband } from './useWarband';

const API = '/api/warband';

/** The link id from a pasted share link (…/warband-builder?w=Qt6ezXn2) or a bare id. */
export function linkIdFrom(text: string): string | null {
  const t = text.trim();
  const id = /^[A-Za-z0-9]{8}$/.test(t) ? t : t.match(/[?&]w=([A-Za-z0-9]{8})\b/)?.[1];
  return id ?? null;
}

/** The address to send to other players. */
export function linkUrl(id: string): string {
  return `${window.location.origin}/warband-builder?w=${id}`;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const message = await res.json().then(b => b.error as string).catch(() => res.statusText);
    throw Object.assign(new Error(message || `Request failed (${res.status})`), { status: res.status });
  }
  return res;
}

/** Upload the warband as a new link and return the link's id. */
export async function shareWarband(warband: Warband): Promise<string> {
  const res = await request(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ warband }),
  });
  return ((await res.json()) as { id: string }).id;
}

/** The warband behind a link, or null if the link doesn't exist. */
export async function fetchSharedWarband(id: string): Promise<Warband | null> {
  try {
    const res = await request(`${API}/${encodeURIComponent(id)}`, { method: 'GET' });
    return ((await res.json()) as { warband: Warband }).warband;
  } catch (e) {
    if ((e as { status?: number }).status === 410) return null;
    throw e;
  }
}
