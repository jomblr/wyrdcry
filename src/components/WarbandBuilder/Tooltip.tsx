import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';

const SHOW_DELAY_MS = 300;

interface Props {
  content: React.ReactNode;
  children: React.ReactElement;
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
