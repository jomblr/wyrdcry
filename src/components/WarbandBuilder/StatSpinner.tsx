import React, { useRef } from 'react';
import Tooltip from './Tooltip';
import styles from './warband-builder.module.css';

interface Props {
  value: number;
  onChange: (newValue: number) => void;
  modified?: boolean;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Invert direction: left-click decreases, right-click increases (e.g. bravery where lower = better) */
  invert?: boolean;
  /** Newline-separated breakdown — tooltip only shown when non-empty */
  breakdown?: string;
  /** When true, renders as plain text — no interaction */
  readonly?: boolean;
}

export default function StatSpinner({ value, onChange, modified, prefix, suffix, min = 1, max, step = 1, invert = false, breakdown, readonly = false }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const touchStartY = useRef<number | null>(null);
  const accumulated = useRef(0);

  function raise() {
    const next = valueRef.current + step;
    onChange(max !== undefined ? Math.min(max, next) : next);
  }
  function lower() { onChange(Math.max(min, valueRef.current - step)); }

  const increment = invert ? lower : raise;
  const decrement = invert ? raise : lower;

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    decrement();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    accumulated.current = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.touches[0].clientY;
    const steps = Math.trunc(delta / 20);
    const diff = steps - accumulated.current;
    if (diff !== 0) {
      accumulated.current = steps;
      onChange(Math.max(min, value + diff * step));
    }
  }

  function handleTouchEnd() {
    touchStartY.current = null;
    accumulated.current = 0;
  }

  if (readonly) {
    return <span className={`${styles.statSpinner} ${styles.statReadonly}`}>{prefix}{value}{suffix}</span>;
  }

  const span = (
    <span
      className={`${styles.statSpinner} ${modified ? styles.statModified : ''}`}
      onClick={increment}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="spinbutton"
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'ArrowUp')   { e.preventDefault(); increment(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); decrement(); }
      }}
    >
      {prefix}{value}{suffix}
    </span>
  );

  const hasBreakdown = Boolean(breakdown?.trim());
  if (!hasBreakdown) return span;

  return (
    <Tooltip
      content={
        <div className="tooltip-breakdown">
          {breakdown!.trim().split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      }
    >
      {span}
    </Tooltip>
  );
}
