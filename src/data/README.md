# Game data (JSON)

These files are **imported at build time** by React components (`import ... from '@site/src/data/....json'`). There is no runtime API.

## Fighter wiki cards (`FactionFighters`)

- **File:** [`fighters.json`](./fighters.json)
- **Not used for cards:** the `"fighters": []` field inside [`factions.json`](./factions.json) — faction pages list fighters only from `fighters.json`.

Each fighter object must include:

- `"faction": "<faction-id>"` — must **exactly** match the faction’s `id` in `factions.json` and the `factionId` prop in the MDX page (e.g. `"clan-eshin"`, not `"Clan Eshin"`).

If cards are empty or look wrong after editing:

1. Confirm you saved `fighters.json` in this project (not a copy elsewhere).
2. **Restart** the dev server (`npm run start`) — JSON hot reload can occasionally stick.
3. Clear Docusaurus cache: `npm run clear`, then start again.
4. Hard-refresh the browser (or disable cache in devtools) if you use `npm run build` + `npm run serve`.

## Other files

| File | Typical consumers |
|------|-------------------|
| `factions.json` | Faction overview, equipment tables, warband builder — optional `warband_keyword` overrides `name` in the warband-limit line on faction pages |
| `weapons.json` / `items.json` | Equipment lists and builder |
| `campaign-rules.json` | Warband builder rules |
| `keywords.json`, `cost-profiles.json` | Limited / future use |
| `weapon-rules.json` | Weapons page glossary + faction equipment names — glossary only lists rules **present in this file** that are still referenced by `weapons.json` |
