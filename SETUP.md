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
| `npm run pdf` | Generate `wyrdcry.pdf` from the docs (run after `build` + `serve`). |

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
