import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { usePluginData } from '@docusaurus/useGlobalData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './scenario-generator.module.css';

interface ScenarioEntry {
  roll: number;
  name: string;
  image?: string;
  markdown: string;
}

interface ScenarioData {
  deployments: ScenarioEntry[];
  victories: ScenarioEntry[];
  twists: ScenarioEntry[];
}

const d6 = () => Math.floor(Math.random() * 6) + 1;

/** Map thumbnail; click opens it full-screen, click or Escape closes. */
function MapImage({ src, alt }: { src: string; alt: string }) {
  const url = useBaseUrl(src);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={styles.mapButton} onClick={() => setOpen(true)}>
        <img className={styles.mapImage} src={url} alt={alt} />
        <span className={styles.enlargeHint}>Click to enlarge</span>
      </button>
      {open && (
        <div className={styles.lightbox} onClick={() => setOpen(false)} role="dialog" aria-label={alt}>
          <img src={url} alt={alt} />
        </div>
      )}
    </>
  );
}

interface PanelProps {
  label: string;
  entries: ScenarioEntry[];
  roll: number | null;
  onSelect: (roll: number | null) => void;
  className?: string;
}

/** A card whose heading *is* the dropdown — "Select Victory Condition ⌄" until something is chosen. */
function Panel({ label, entries, roll, onSelect, className }: PanelProps) {
  const entry = entries.find(e => e.roll === roll);
  // Browsers mark a select as :focus-visible even after a mouse click, so track how it
  // was focused ourselves: outline for keyboard users, none after picking with the mouse.
  const [pointerFocus, setPointerFocus] = useState(false);
  return (
    <section className={`wyrd-card ${styles.card} ${className ?? ''}`}>
      {/* The visible heading is plain text; an invisible native select sits on top of it.
          The OS menu copies the select's own font size, so the select stays at body size
          while the heading can be large. */}
      <div className={`${styles.picker} ${pointerFocus ? '' : styles.keyboardFocus}`}>
        <span className={styles.pickerLabel}>{entry ? `${entry.roll}: ${entry.name}` : `Select ${label}`}</span>
        <select
          aria-label={`Select ${label}`}
          className={styles.select}
          onPointerDown={() => setPointerFocus(true)}
          onKeyDown={() => setPointerFocus(false)}
          onBlur={() => setPointerFocus(false)}
          value={roll ?? ''}
          onChange={e => onSelect(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Select {label}</option>
          {entries.map(e => (
            <option key={e.roll} value={e.roll}>{e.roll}: {e.name}</option>
          ))}
        </select>
      </div>
      {entry && (
        <div className={`markdown ${styles.body}`}>
          {entry.image && <MapImage src={entry.image} alt={`${entry.name} deployment map`} />}
          {entry.markdown && <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.markdown}</ReactMarkdown>}
        </div>
      )}
    </section>
  );
}

export default function ScenarioGeneratorPage() {
  const { deployments, victories, twists } = usePluginData('scenario-data') as ScenarioData;
  const [deployment, setDeployment] = useState<number | null>(null);
  const [victory, setVictory] = useState<number | null>(null);
  const [twist, setTwist] = useState<number | null>(null);

  function generate() {
    (window as any).gtag?.('event', 'generate_scenario');
    setDeployment(d6());
    setVictory(d6());
    setTwist(d6());
  }

  return (
    <Layout title="Scenario Generator" description="Roll a random Wyrdcry scenario: deployment map, victory condition and twist">
      <main className={`container ${styles.page}`}>
        <h1 className={styles.title}>Scenario Generator</h1>
        <p className={styles.subtitle}>Rolls a d6 for Deployment Map, Victory Condition and Twist.</p>
        <button type="button" className="button button--primary button--lg" onClick={generate}>
          Generate Scenario
        </button>

        <div className={styles.grid}>
          <Panel label="Victory Condition" entries={victories} roll={victory} onSelect={setVictory} className={styles.victory} />
          <Panel label="Map" entries={deployments} roll={deployment} onSelect={setDeployment} />
          <Panel label="Twist" entries={twists} roll={twist} onSelect={setTwist} />
        </div>
      </main>
    </Layout>
  );
}
