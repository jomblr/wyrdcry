# Fighter name lists

Random-name pools for the Warband Builder, so new fighters get a name instead of
"New Fighter". (The builder feature itself isn't built yet.)

## Race files — `skaven.json`, `human.json`, …

One file per race, named after the race in lowercase with hyphens (`dire-wolf.json`).
`race` must match a value in fighters' `race` field exactly (`"SKAVEN"`, `"WAR HOUND"`);
that's how a fighter finds its names, so one file covers every faction of that race.

Names are split by gender:

```json
{
  "race": "HUMAN",
  "names": {
    "male": ["Dietger", "Gonzalo", "…"],
    "female": ["…"],
    "neutral": []
  }
}
```

- `male` / `female` — gendered names.
- `neutral` — names that fit anyone (most Skaven names live here).
- Any list can be empty.

## Faction rules — `factions.json`

Says which lists a faction draws from, by faction id:

| Value | Picks from |
|---|---|
| `"random"` (default — any faction not listed) | male + female + neutral |
| `"female"` | female + neutral |
| `"male"` | male + neutral |

```json
{ "sisters-of-sigmar": "female" }
```

If the allowed lists are all empty for a fighter, the builder falls back to "New Fighter".

These files aren't tied to a ruleset version and aren't part of the WyrdForge export,
so exports never overwrite them.
