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

## Game data and WyrdForge

`src/data/*.json` is the single source of truth for all game data. The site imports it
directly; the WyrdForge authoring tool at `/forge` cannot, so
`scripts/copy-forge-data.js` copies the files into `static/forge/data/` before every
`start` and `build`.

That destination is generated and gitignored — never edit it by hand. After changing
game data, restart the dev server so the copy is refreshed.

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
  The published PDFs in `static/files/` are checked in, so this script is only needed
  when regenerating them.
