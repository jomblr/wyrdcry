/**
 * The address players share: /w/:id. Link previewers (Facebook, Discord…) read this page, so its
 * og:url keeps the id; the builder page's own og:url and canonical point at /warband-builder and
 * would drop `?w=`. Browsers go straight on to the builder, which offers the import.
 */
import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';
import factions from '../../src/data/factions.json';

const ID_PATTERN = /^[A-Za-z0-9]{8}$/;

const escape = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default async (req: Request, context: Context) => {
  const id = context.params.id;
  const origin = new URL(req.url).origin;
  if (!ID_PATTERN.test(id)) return Response.redirect(`${origin}/warband-builder/`, 302);

  const builder = `${origin}/warband-builder/?w=${id}`;
  const record = (await getStore({ name: 'warbands', consistency: 'strong' }).get(id, { type: 'json' })) as
    | { warband: { name?: string; factionId?: string | null; fighters?: unknown[] } }
    | null;
  const wb = record?.warband;
  const title = wb ? wb.name || 'Untitled Warband' : 'Wyrdcry warband';
  const faction = factions.find(f => f.id === wb?.factionId)?.name;
  const count = wb?.fighters?.length ?? 0;
  const description = wb
    ? [faction, `${count} ${count === 1 ? 'fighter' : 'fighters'}`].filter(Boolean).join(' · ') +
      ' — open to import a copy in the Wyrdcry Warband Builder.'
    : 'This warband link doesn’t exist any more.';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(title)} | Wyrdcry</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escape(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wyrdcry">
<meta property="og:url" content="${origin}/w/${id}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${origin}/img/wyrdcry-bg.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${origin}/w/${id}">
<script>location.replace(${JSON.stringify(builder)});</script>
</head>
<body><p><a href="${builder}">Open ${escape(title)} in the Warband Builder</a></p></body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};

export const config: Config = { path: '/w/:id' };
