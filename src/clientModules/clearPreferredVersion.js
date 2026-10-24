// There's no version toggle in the UI any more, but readers who once picked 0.5 in the
// old dropdown still have that saved — and the navbar's Rules/Warbands/Campaigns links
// follow it, which would strand them on the archived rules. Drop the saved choice so
// everyone lands on the current ruleset. (0.5 stays reachable by direct /docs/0.5/ URL.)
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('docs-preferred-version-default');
  } catch {
    // Storage blocked (private mode etc.) — nothing saved, nothing to clear.
  }
}
