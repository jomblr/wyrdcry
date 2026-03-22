import React, {useState, useEffect} from 'react';

type HeroInjuryEntry =
  | {value: number; id: string; label: string}
  | {min: number; max: number; id: string; label: string};

const HERO_INJURIES: HeroInjuryEntry[] = [
  {min: 11, max: 12, id: 'dead', label: 'Dead'},
  {min: 13, max: 14, id: 'bleeding-out', label: 'Bleeding Out'},
  {min: 15, max: 16, id: 'deep-wound', label: 'Deep wound'},
  {value: 21, id: 'wyrdlung-rot', label: '[Trait] Wyrdlung Rot'},
  {value: 22, id: 'crippled-leg', label: '[Trait] Crippled leg'},
  {value: 23, id: 'fractured-arm', label: '[Trait] Fractured arm'},
  {value: 24, id: 'devastated-eye', label: '[Trait] Devastated eye'},
  {value: 25, id: 'festering-wound', label: '[Trait] Festering wound'},
  {value: 26, id: 'nervous-tick', label: '[Trait] Nervous tick'},
  {value: 31, id: 'stupidity', label: '[Trait] Stupidity'},
  {value: 32, id: 'hallucinations', label: '[Trait] Hallucinations'},
  {value: 33, id: 'claustrophobic', label: '[Trait] Claustrophobic'},
  {value: 34, id: 'amnesia', label: '[Trait] Amnesia'},
  {value: 35, id: 'kleptomania', label: '[Trait] Kleptomania'},
  {value: 36, id: 'paranoid', label: '[Trait] Paranoid'},
  {min: 41, max: 56, id: 'flesh-wound', label: 'Flesh wound'},
  {value: 61, id: 'robbed', label: 'Robbed'},
  {value: 62, id: 'captured', label: 'Captured'},
  {value: 63, id: 'rival', label: '[Talent] Rival'},
  {value: 64, id: 'hardened', label: 'Hardened'},
  {value: 65, id: 'terrible-scars', label: '[Talent] Terrible scars'},
  {value: 66, id: 'against-all-odds', label: 'Against all odds'},
];

function rollD66(): number {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return d1 * 10 + d2;
}

function findHeroInjury(roll: number): HeroInjuryEntry | undefined {
  return HERO_INJURIES.find((entry) => {
    if ('value' in entry) return entry.value === roll;
    return roll >= entry.min && roll <= entry.max;
  });
}

export default function HeroInjuryRoller() {
  const [roll, setRoll] = useState<number | null>(null);

  useEffect(() => {
    if (roll === null) return;
    const t = setTimeout(() => setRoll(null), 2000);
    return () => clearTimeout(t);
  }, [roll]);

  function highlightRowForId(id: string, doScroll: boolean) {
    if (typeof document === 'undefined') return;

    const el = document.getElementById(id);
    const row = el?.closest('tr') as HTMLElement | null;
    if (!row) return;

    // Clear any previous highlight
    document
      .querySelectorAll<HTMLElement>('.injury-row-highlight')
      .forEach((r) => r.classList.remove('injury-row-highlight'));

    row.classList.add('injury-row-highlight');

    if (doScroll) {
      row.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    // Ensure a back-to-top icon exists in the last cell
    const lastCell = row.querySelector('td:last-child') as HTMLElement | null;
    if (lastCell && !lastCell.querySelector('.injury-back-to-top')) {
      const link = document.createElement('a');
      link.href = '#hero-injuries';
      link.className = 'injury-back-to-top';
      link.setAttribute('aria-label', 'Back to Hero Injuries');
      link.title = 'Back to Hero Injuries';
      link.onclick = (e) => {
        e.preventDefault();
        row.classList.remove('injury-row-highlight');
        link.remove();
        const heading = document.getElementById('hero-injuries');
        if (heading) {
          heading.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
      };
      lastCell.appendChild(link);
    }
  }

  function resetPreviousRoll() {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll<HTMLElement>('.injury-row-highlight')
      .forEach((r) => r.classList.remove('injury-row-highlight'));
    document.querySelectorAll('.injury-back-to-top').forEach((el) => el.remove());
  }

  function handleRoll() {
    setRoll(null);
    resetPreviousRoll();
    const value = rollD66();
    const injury = findHeroInjury(value);
    if (injury) {
      highlightRowForId(injury.id, true);
    }
    requestAnimationFrame(() => {
      setRoll(value);
    });
  }

  return (
    <div className="hero-injury-roller">
      <button type="button" className="button button--primary" onClick={handleRoll}>
        Roll Hero Injury (d66)
      </button>
      {roll !== null && (
        <span className="injury-roll-result" aria-live="polite">
          Rolled a {roll}
        </span>
      )}
    </div>
  );
}

