#!/usr/bin/env node
/**
 * Renders the printable game reference at /print/game-reference to a PDF, using
 * the puppeteer that ships with docusaurus-docs-to-pdf.
 *
 * Two targets:
 *
 *   --from-build   writes into build/files/, so every deploy ships a PDF built
 *                  from that deploy's rules. Runs as npm's postbuild hook, and
 *                  must never build the site itself — that would recurse.
 *   (default)      builds the site, then writes into static/files/, updating the
 *                  copy committed to the repo. The inner build's postbuild hook
 *                  stands down (see SKIP_ENV) so the sheet is rendered once.
 *
 * Other flags: --skip-build reuses an existing build/, --url renders from an
 * already running server (for example `npm start`). Set
 * PUPPETEER_EXECUTABLE_PATH to use a locally installed Chrome.
 *
 * In --from-build mode a failure is reported but does not fail the build: the
 * deploy then ships the committed PDF rather than no site at all.
 *
 * The sheet must never run longer than two pages. The render is checked before
 * anything is written, so an overlong sheet leaves the existing PDF untouched.
 */
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const ruleset = require('../src/data/ruleset.json');

const root = path.resolve(__dirname, '..');
const ROUTE = '/print/game-reference';
const MAX_PAGES = 2;
const FILENAME = `game-reference-${ruleset.slug}.pdf`;
const LEGACY_FILENAME = 'game-reference.pdf';
/** Set on the build this script starts itself, so its postbuild hook stands down. */
const SKIP_ENV = 'WYRDCRY_SKIP_REFERENCE_PDF';

const args = process.argv.slice(2);
const fromBuild = args.includes('--from-build');
const skipBuild = args.includes('--skip-build') || fromBuild;

let urlArg = null;
if (args.includes('--url')) {
  urlArg = args[args.indexOf('--url') + 1];
  if (!urlArg || urlArg.startsWith('--')) {
    console.error('[game-reference] --url needs a URL, for example --url http://localhost:3000/print/game-reference');
    process.exit(1);
  }
}

const outDir = fromBuild ? path.join(root, 'build', 'files') : path.join(root, 'static', 'files');
const outPath = path.join(outDir, FILENAME);

/**
 * Chrome writes the page tree uncompressed, so the page count can be read
 * straight out of the bytes without a PDF library.
 */
function countPages(pdf) {
  const match = /\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/.exec(pdf.toString('latin1'));
  if (!match) throw new Error('Could not read the page count from the rendered PDF');
  return Number(match[1]);
}

/**
 * Two renders of unchanged content differ only in the timestamps Chrome embeds.
 * Blanking those makes "has anything actually changed?" answerable, which keeps
 * the committed PDF out of the diff when nothing about the sheet moved.
 */
function withoutTimestamps(pdf) {
  return pdf.toString('latin1').replace(/\/(?:Creation|Mod)Date\s*\([^)]*\)/g, '');
}

function isUnchanged(pdf, file) {
  if (!fs.existsSync(file)) return false;
  return withoutTimestamps(fs.readFileSync(file)) === withoutTimestamps(pdf);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function run(command, commandArgs, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))
    );
  });
}

function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, res => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() > deadline) {
            reject(new Error(`Server at ${url} did not become ready`));
            return;
          }
          setTimeout(attempt, 500);
        });
    };
    attempt();
  });
}

/**
 * Points the previous, unversioned download path at the current file, so links
 * shared before the filename carried a version keep working. Any other rule in
 * the file is left alone.
 */
function writeRedirect(dir) {
  const file = path.join(dir, '..', '_redirects');
  const rule = `/files/${LEGACY_FILENAME} /files/${FILENAME} 301`;
  const kept = fs.existsSync(file)
    ? fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith(`/files/${LEGACY_FILENAME} `))
    : [];
  fs.writeFileSync(file, [...kept, rule].join('\n') + '\n');
}

async function main() {
  let url = urlArg;
  let server = null;
  let browser = null;

  try {
    if (!url) {
      if (!skipBuild) {
        await run('npm', ['run', 'build'], { [SKIP_ENV]: '1' });
      } else if (!fs.existsSync(path.join(root, 'build'))) {
        throw new Error('No build/ directory — run without --skip-build, or run `npm run build` first.');
      }

      // An ephemeral port cannot collide with a server that is already running,
      // which would otherwise be rendered into the PDF instead of this build.
      const port = await freePort();
      url = `http://localhost:${port}${ROUTE}`;
      server = spawn('npx', ['docusaurus', 'serve', '--port', String(port), '--no-open'], {
        cwd: root,
        stdio: 'ignore',
      });
      await waitForServer(url);
    }

    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const pdf = Buffer.from(
      await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    );

    const pages = countPages(pdf);
    if (pages > MAX_PAGES) {
      throw new Error(
        `The sheet renders as ${pages} pages, and must fit ${MAX_PAGES}. ` +
          'Shorten src/data/game-reference.json or tighten src/pages/print/. Nothing was written.'
      );
    }

    fs.mkdirSync(outDir, { recursive: true });
    writeRedirect(outDir);

    if (isUnchanged(pdf, outPath)) {
      console.log(`[game-reference] ${path.relative(root, outPath)} is already up to date`);
      return;
    }

    fs.writeFileSync(outPath, pdf);
    const kb = Math.round(pdf.length / 1024);
    console.log(`[game-reference] wrote ${path.relative(root, outPath)} (${kb} KB)`);
  } finally {
    // The server is killed first and on its own: if closing a crashed browser
    // throws, a still-running server would keep this process alive for good.
    if (server) server.kill();
    if (browser) await browser.close();
  }
}

if (fromBuild && process.env[SKIP_ENV]) {
  console.log('[game-reference] skipped — the sheet is rendered by the outer run');
} else {
  main().catch(error => {
    if (fromBuild) {
      console.warn(`[game-reference] could not render the PDF: ${error.message}`);
      console.warn(`[game-reference] the deploy ships the committed static/files/${FILENAME} instead.`);
      return;
    }
    console.error(`[game-reference] ${error.message}`);
    process.exit(1);
  });
}
