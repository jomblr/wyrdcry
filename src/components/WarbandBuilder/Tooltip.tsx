import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';

const SHOW_DELAY_MS = 300;

/** What Tooltip needs from its child: a ref to measure, and the handlers it wraps. */
interface TooltipChildProps {
  ref?: React.Ref<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
}

interface Props {
  content: React.ReactNode;
  children: React.ReactElement<TooltipChildProps>;
}

export default function Tooltip({ content, children }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current !== null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const positionFromEl = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const maxWidth = 320; // matches max-width in CSS
    const idealLeft = rect.left + window.scrollX + rect.width / 2;
    const minLeft = maxWidth / 2 + 8;
    const maxLeft = window.scrollX + window.innerWidth - maxWidth / 2 - 8;
    setPos({
      top: rect.top + window.scrollY - 8,
      left: Math.min(Math.max(idealLeft, minLeft), maxLeft),
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
  });

  const tooltip = visible && content
    ? ReactDOM.createPortal(
        <div className="tooltip" style={{ top: pos.top, left: pos.left }}>
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
