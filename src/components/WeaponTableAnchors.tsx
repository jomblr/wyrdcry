import React, { useEffect } from 'react';

/**
 * Ensures each weapon name cell in .weapon-table has id="weapon-{slug}"
 * so anchor links from FactionWeapons / WeaponLink work even if markdown stripped the spans.
 */
function slugFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default function WeaponTableAnchors() {
  useEffect(() => {
    const tables = document.querySelectorAll('.weapon-table table');
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((tr) => {
        const firstCell = tr.querySelector('td:first-child');
        if (!firstCell) return;
        if (firstCell.id?.startsWith('weapon-')) return;
        if (firstCell.querySelector('[id^="weapon-"]')) return;
        const text = (firstCell.textContent || '').trim();
        if (!text) return;
        const slug = slugFromText(text);
        if (slug) firstCell.id = 'weapon-' + slug;
      });
    });
    // Scroll to hash target after ids are set (helps SPA navigation)
    const hash = window.location.hash;
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  return null;
}
