import React, {useState, useEffect} from 'react';

type HenchmanInjuryEntry = {min: number; max: number; id: string};

const HENCHMAN_INJURIES: HenchmanInjuryEntry[] = [
  {min: 1, max: 2, id: 'hench-dead'},
  {min: 3, max: 6, id: 'hench-full-recovery'},
];

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function findHenchmanInjury(roll: number): HenchmanInjuryEntry | undefined {
  return HENCHMAN_INJURIES.find((entry) => roll >= entry.min && roll <= entry.max);
}

export default function HenchmanInjuryRoller() {
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

    document
      .querySelectorAll<HTMLElement>('.injury-row-highlight')
      .forEach((r) => r.classList.remove('injury-row-highlight'));

    row.classList.add('injury-row-highlight');

    if (doScroll) {
      row.scrollIntoView({behavior: 'smooth', block: 'center'});
    }

    const lastCell = row.querySelector('td:last-child') as HTMLElement | null;
    if (lastCell && !lastCell.querySelector('.injury-back-to-top')) {
      const link = document.createElement('a');
      link.href = '#henchman-injuries';
      link.className = 'injury-back-to-top';
      link.setAttribute('aria-label', 'Back to Henchman Injuries');
      link.title = 'Back to Henchman Injuries';
      link.onclick = (e) => {
        e.preventDefault();
        row.classList.remove('injury-row-highlight');
        link.remove();
        const heading = document.getElementById('henchman-injuries');
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
    const value = rollD6();
    const injury = findHenchmanInjury(value);
    if (injury) {
      highlightRowForId(injury.id, false);
    }
    requestAnimationFrame(() => {
      setRoll(value);
    });
  }

  return (
    <div className="hero-injury-roller">
      <button type="button" className="button button--primary" onClick={handleRoll}>
        Roll Henchman Injury (d6)
      </button>
      {roll !== null && (
        <span className="injury-roll-result" aria-live="polite">
          Rolled a {roll}
        </span>
      )}
    </div>
  );
}
