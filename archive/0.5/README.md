# Wyrdcry 0.5 playtest (archived)

Kept for posterity. Not built into the site — wyrdcry.net only serves the 1.0 rules.
Old `/docs/0.5/*` links redirect to the matching 1.0 page (see `static/_redirects`).

- `docs/` — the 0.5 rules pages (was `versioned_docs/version-0.5/`)
- `sidebars.json` — their sidebar (was `versioned_sidebars/version-0.5-sidebars.json`)
- `data/` — the 0.5 game data JSON (was `src/data/*.json`)

The pages use site components (`FactionFighters`, etc.) that now read 1.0 data, so
they won't render faithfully if dropped back in as-is. To view 0.5 exactly as it was,
check out a commit from before the 1.0 release.
