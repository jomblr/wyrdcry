// Parses the 0.9 scenario tables (docs/rules/scenarios/*.md) into global data for the
// Scenario Generator page. The .md files stay the single source of truth — edit them in
// Obsidian and the tool follows; in dev, edits hot-reload via getPathsToWatch.
const fs = require('fs');
const path = require('path');

const SOURCES = {
  deployments: 'docs/rules/scenarios/deployment-maps.md',
  victories: 'docs/rules/scenarios/victory-conditions.md',
  twists: 'docs/rules/scenarios/twists.md',
};

function parseTable(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const entries = [];
  // Split on "## N: Name" headings; anything before the first one (title, rules) is dropped.
  const parts = raw.split(/^##\s+(\d+)\s*:\s*(.+?)\s*$/m);
  for (let i = 1; i < parts.length; i += 3) {
    let body = parts[i + 2]
      .split('\n')
      .filter(line => !/^\s*:::/.test(line) && !/^\s*---\s*$/.test(line))
      .join('\n');
    let image;
    const img = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (img) {
      image = img[1];
      body = body.replace(img[0], '');
    }
    entries.push({ roll: Number(parts[i]), name: parts[i + 1], image, markdown: body.trim() });
  }
  if (entries.length < 6) {
    throw new Error(`[scenario-data] ${file}: expected 6 "## N: Name" entries, found ${entries.length}`);
  }
  return entries;
}

module.exports = function scenarioDataPlugin(context) {
  const files = Object.fromEntries(
    Object.entries(SOURCES).map(([k, rel]) => [k, path.join(context.siteDir, rel)]),
  );
  return {
    name: 'scenario-data',
    async loadContent() {
      return Object.fromEntries(Object.entries(files).map(([k, f]) => [k, parseTable(f)]));
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
    getPathsToWatch() {
      return Object.values(files);
    },
  };
};
