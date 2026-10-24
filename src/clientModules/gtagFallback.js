/**
 * Guard against `window.gtag is not a function`.
 *
 * Docusaurus's own gtag client module calls window.gtag on every route change,
 * but the function is only defined by an inline <head> snippet that the plugin
 * injects in production builds. It can be missing in two situations:
 *
 *   1. Dev: `npm run build` regenerates .docusaurus/client-modules.js with the
 *      gtag module listed, and a running `docusaurus start` picks that up — so
 *      the module runs while the snippet was never injected.
 *   2. Production: a visitor's content blocker strips the inline snippet, so
 *      every client-side navigation throws in their console.
 *
 * Neither case is recoverable (there's no analytics to send), but both are
 * noisy. Define a no-op only when the real one is absent — the inline snippet
 * runs during HTML parse, long before client modules, so it always wins.
 */
if (typeof window !== 'undefined' && typeof window.gtag !== 'function') {
  window.gtag = function gtagNoop() {};
}

export default {};
