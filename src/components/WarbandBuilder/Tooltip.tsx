import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

const SHOW_DELAY_MS = 300;

/** What Tooltip needs from its child: a ref to measure, and the handlers it wraps. */
interface TooltipChildProps {
  ref?: React.Ref<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  onPointerDown?: React.PointerEventHandler;
  onClick?: React.MouseEventHandler;
}

interface Props {
  content: React.ReactNode;
  children: React.ReactElement<TooltipChildProps>;
}

export default function Tooltip({ content, children }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Where the arrow sits, in px from the tip's left edge; null = centred
  const [arrowX, setArrowX] = useState<number | null>(null);
  // Opens above the target; flips below when there isn't room above (e.g. under the navbar).
  const [below, setBelow] = useState(false);
  const targetRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const anchorRect = useRef<DOMRect | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Touch has no hover: remember how the last press happened so a tap can toggle instead.
  const lastPointer = useRef<string>('mouse');

  const clearShowTimer = useCallback(() => {
    if (showTimer.current !== null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const positionFromEl = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    anchorRect.current = rect;
    setBelow(false);
    setArrowX(null);
    // Centred on the target; kept on screen once its real width is known (layout effect below)
    setPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, []);

  const hide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  const child = React.cloneElement(children, {
    ref: targetRef,
    onMouseEnter: (e: React.MouseEvent) => {
      clearShowTimer();
      const el = e.currentTarget as HTMLElement;
      showTimer.current = setTimeout(() => {
        const node = targetRef.current ?? el;
        positionFromEl(node);
        setVisible(true);
      }, SHOW_DELAY_MS);
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    onPointerDown: (e: React.PointerEvent) => {
      lastPointer.current = e.pointerType;
      children.props.onPointerDown?.(e);
    },
    // Tap (touch/pen): first tap shows the tooltip straight away — and holds back a link's
    // navigation — a second tap closes it and lets a link through. Mouse clicks are untouched.
    onClick: (e: React.MouseEvent) => {
      if (lastPointer.current !== 'mouse') {
        clearShowTimer();
        if (!visible) {
          e.preventDefault();
          positionFromEl(targetRef.current ?? (e.currentTarget as HTMLElement));
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
      children.props.onClick?.(e);
    },
  });

  // While open after a tap: close on a tap anywhere else, or when the page scrolls.
  useEffect(() => {
    if (!visible) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (targetRef.current?.contains(t) || tipRef.current?.contains(t)) return;
      hide();
    };
    const onScroll = () => hide();
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [visible, hide]);

  // Once rendered, keep it inside the window using its actual width, and point the arrow at the
  // target even when the tip had to shift sideways.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const rect = anchorRect.current;
    if (!visible || !tip || !rect) return;
    const width = tip.offsetWidth;
    const targetX = rect.left + window.scrollX + rect.width / 2;
    const minLeft = window.scrollX + width / 2 + 8;
    const maxLeft = window.scrollX + window.innerWidth - width / 2 - 8;
    const left = Math.min(Math.max(targetX, minLeft), maxLeft);
    if (Math.abs(left - pos.left) > 0.5) setPos(p => ({ ...p, left }));
    const arrow = Math.min(Math.max(targetX - (left - width / 2), 10), width - 10);
    setArrowX(Math.abs(left - targetX) > 0.5 ? arrow : null);
  }, [visible, pos.left]);

  // Once rendered, check it fits above the target; otherwise show it below instead.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const rect = anchorRect.current;
    if (!visible || !tip || !rect || below) return;
    const navbar = document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0;
    if (rect.top - tip.offsetHeight - 8 < navbar) {
      setBelow(true);
      setPos(p => ({ ...p, top: rect.bottom + window.scrollY + 8 }));
    }
  }, [visible, below, pos.left]);

  const tooltip = visible && content
    ? ReactDOM.createPortal(
        <div
          ref={tipRef}
          className={below ? 'tooltip tooltip--below' : 'tooltip'}
          style={{ top: pos.top, left: pos.left, ...(arrowX !== null ? { '--tooltip-arrow-x': `${arrowX}px` } : {}) } as React.CSSProperties}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {child}
      {tooltip}
    </>
  );
}
