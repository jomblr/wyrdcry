/** Shared helper: calculate portal dropdown position with flip-up when near the bottom. */
export interface DropdownPos {
  top: number;
  left: number;
  flipUp: boolean;
}

const FLIP_THRESHOLD = 300; // px of space below before we flip

export function calcDropdownPos(
  rect: DOMRect,
  opts: { alignRight?: boolean } = {},
): DropdownPos {
  const spaceBelow = window.innerHeight - rect.bottom;
  const flipUp = spaceBelow < FLIP_THRESHOLD;

  return {
    top: flipUp
      ? rect.top + window.scrollY     // translateY(-100%) shifts it above
      : rect.bottom + window.scrollY + 4,
    left: opts.alignRight
      ? rect.right + window.scrollX   // translateX(-100%) right-aligns it
      : rect.left + window.scrollX,
    flipUp,
  };
}

export function dropdownStyle(pos: DropdownPos, alignRight = false): React.CSSProperties {
  return {
    position: 'absolute',
    top: pos.top,
    left: pos.left,
    transform: [
      pos.flipUp ? 'translateY(-100%)' : undefined,
      alignRight ? 'translateX(-100%)' : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
  };
}

// Needed for the React.CSSProperties return type
import type React from 'react';
