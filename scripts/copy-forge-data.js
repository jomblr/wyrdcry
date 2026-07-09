// Copies the canonical game data from src/data into the WyrdForge sandbox
// (static/forge/data) so the sandbox at /forge reads the same source of truth
// as the site's WarbandBuilder. Runs automatically before `start` and `build`.
// The destination is generated (gitignored); src/data remains the single source.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src', 'data');
const destDir = path.join(root, 'static', 'forge', 'data');

const FILES = [
  'factions.json',
  'fighters.json',
  'weapons.json',
  'weapon-rules.json',
  'items.json',
  'abilities.json',
  'keywords.json',
  'cost-profiles.json',
];

fs.mkdirSync(destDir, { recursive: true });
let copied = 0;
for (const f of FILES) {
  const from = path.join(srcDir, f);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-forge-data] missing ${path.relative(root, from)} — skipping`);
    continue;
  }
  fs.copyFileSync(from, path.join(destDir, f));
  copied++;
}
console.log(`[copy-forge-data] copied ${copied}/${FILES.length} data files to ${path.relative(root, destDir)}`);
