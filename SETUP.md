# Local development setup (Wyrdcry site)

Instructions for running the Wyrdcry Docusaurus site on your machine.

## Prerequisites

- **Node.js** ≥ 20  
  Check: `node -v`  
  Install from [nodejs.org](https://nodejs.org/) or use a version manager (nvm, fnm, etc.).

- **npm** (included with Node)  
  Check: `npm -v`

## Setup

1. **Clone the repo** (if you haven’t already)
   ```bash
   git clone <repository-url>
   cd wyrdcry-site
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npm run start
   ```
   The site will open at **http://localhost:3000** (or the next free port). Edits to docs, components, and CSS will hot-reload.

## Useful commands

| Command | Description |
|--------|-------------|
| `npm run start` | Run the dev server (default: http://localhost:3000) |
| `npm run build` | Build the site for production (output in `build/`) |
| `npm run serve` | Serve the production build locally (run after `build`) |
| `npm run typecheck` | Type-check the TypeScript sources without emitting output |
| `npm run clear` | Clear Docusaurus cache (`.docusaurus/`). Use if content or routes seem stuck. |
| `npm run copy:forge-data` | Copy `src/data/*.json` into `static/forge/data/` (runs automatically on start/build) |
| `npm run pdf` | Generate `wyrdcry.pdf` from the docs (run after `build` + `serve`). |
| `npm run pdf:reference` | Re-render the game reference PDF in `static/files/` from `/print/game-reference`. |

## Game data and WyrdForge

`src/data/*.json` is the single source of truth for all game data. The site imports it
directly; the WyrdForge authoring tool at `/forge` cannot, so
`scripts/copy-forge-data.js` copies the files into `static/forge/data/` before every
`start` and `build`.

That destination is generated and gitignored — never edit it by hand. After changing
game data, restart the dev server so the copy is refreshed.

Some entries in `weapon-rules.json` and `universal-abilities.json` carry an extra
`short` field. That is a plain-language wording of the same rule, used only by the
printable game reference, where space is tight; wiki and builder always show
`description`. Change one and check the other — nothing enforces that the two agree.

## The game reference PDF

The sheet is rendered from the route `/print/game-reference`, a two-page printable
document. It is published as `static/files/game-reference-<version>.pdf`, where the
version comes from `src/data/ruleset.json` — the same file the download link on the
Downloads page reads, so link and filename cannot drift apart. The previous,
unversioned path is kept working by a `_redirects` rule the render writes alongside
the PDF.

The condensed wordings live in `src/data/game-reference.json`, one entry per section with a `source` link to the rules
page it summarises; the ability and weapon rule lists are read from
`src/data/universal-abilities.json` and `src/data/weapon-rules.json`, the same files the
wiki and the warband builder use.

`npm run build` re-renders the sheet into `build/files/` through its `postbuild` hook,
so every deploy ships a PDF built from that deploy's rules. If the render fails — no
browser in the build environment, for instance — the build logs a warning and continues,
and the deploy ships the copy committed to `static/files/`. Watch the build log for
`[game-reference]` to tell the two apart.

Run `npm run pdf:reference` to update the committed copy as well. It rewrites the
file only when the sheet actually changed, so an unchanged render leaves no diff.
Editing the sheet means editing `src/data/game-reference.json` or the print styles in
`src/pages/print/`, never the PDF.

The sheet must fit two pages. The render is checked before anything is written, so an
overlong sheet fails loudly and leaves the existing PDF untouched.

## If something breaks

- **Stale content or broken links after changing/removing docs or blog posts**  
  Clear the cache and restart:
  ```bash
  npm run clear
  npm run start
  ```

- **Port already in use**  
  Use another port: `npm run start -- --port 3001`

- **Node version errors**  
  Ensure Node is ≥ 20: `node -v`

- **`npm run pdf` fails to launch a browser**  
  The script hardcodes the macOS Chrome path
  (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). On other platforms —
  or without Chrome installed — override it:
  ```bash
  PUPPETEER_EXECUTABLE_PATH=/path/to/chrome npm run pdf
  ```
  The same override applies to `npm run pdf:reference` and to the `postbuild` hook.
  `wyrdcry-rulebook-v0-5-playtest.pdf` and `warband-roster.pdf` in `static/files/` are
  checked in and not generated from the site.
