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
| `npm run clear` | Clear Docusaurus cache (`.docusaurus/`). Use if content or routes seem stuck. |
| `npm run import-profiles` | Import fighter and weapon profiles from `fighter-profiles.json` and `weapon-profiles.json` (optional). |

## Optional: profile import

If you use the fighter/weapon export/import workflow:

```bash
npm run import-profiles
```

Imports fighters from `fighter-profiles.json` into `src/fighters/`, and weapons from `weapon-profiles.json` into `docs/warbands/equipment/weapons.md`. Custom fighter JSON path:

```bash
npm run import-profiles -- "/path/to/your-fighter-profiles.json"
```

See `docs/warbands/ADDING-FIGHTERS.md` for the full workflow.

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
