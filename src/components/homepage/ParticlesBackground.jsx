import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';

function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({x: 0, y: 0});

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({x: event.clientX, y: event.clientY});
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return mousePosition;
}

function hexToRgb(hex) {
  let normalized = hex.replace('#', '');

  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const hexInt = Number.parseInt(normalized, 16);
  const red = (hexInt >> 16) & 255;
  const green = (hexInt >> 8) & 255;
  const blue = hexInt & 255;
  return [red, green, blue];
}

function remapValue(value, start1, end1, start2, end2) {
  const remapped =
    ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
  return remapped > 0 ? remapped : 0;
}

/**
 * Canvas particles (ported from shadcn-style Particles: mouse easing + drift).
 * Container should fill the hero layer; stays pointer-events safe via parent.
 */
export default function ParticlesBackground({
  className,
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = '#ffffff',
  vx = 0,
  vy = 0,
}) {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const contextRef = useRef(null);
  const circlesRef = useRef([]);
  const mousePosition = useMousePosition();
  const mouseRef = useRef({x: 0, y: 0});
  const canvasSizeRef = useRef({w: 0, h: 0});
  const animationRef = useRef(0);
  const dprRef = useRef(1);

  const rgb = hexToRgb(color);

  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext('2d');
    }
    initCanvas();
    animate();
    window.addEventListener('resize', initCanvas);

    return () => {
      window.removeEventListener('resize', initCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color]);

  useEffect(() => {
    onMouseMove();
  }, [mousePosition.x, mousePosition.y]);

  useEffect(() => {
    initCanvas();
  }, [refresh]);

  function initCanvas() {
    resizeCanvas();
    drawParticles();
  }

  function onMouseMove() {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const {w, h} = canvasSizeRef.current;
      const x = mousePosition.x - rect.left - w / 2;
      const y = mousePosition.y - rect.top - h / 2;
      const inside =
        x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
      if (inside) {
        mouseRef.current.x = x;
        mouseRef.current.y = y;
      }
    }
  }

  function circleParams() {
    const x = Math.floor(Math.random() * canvasSizeRef.current.w);
    const y = Math.floor(Math.random() * canvasSizeRef.current.h);
    const translateX = 0;
    const translateY = 0;
    const pSize = Math.floor(Math.random() * 2) + size;
    const alpha = 0;
    const targetAlpha = Number.parseFloat(
      (Math.random() * 0.6 + 0.1).toFixed(1),
    );
    const dx = (Math.random() - 0.5) * 0.1;
    const dy = (Math.random() - 0.5) * 0.1;
    const magnetism = 0.1 + Math.random() * 4;
    return {
      x,
      y,
      translateX,
      translateY,
      size: pSize,
      alpha,
      targetAlpha,
      dx,
      dy,
      magnetism,
    };
  }

  function resizeCanvas() {
    if (
      canvasContainerRef.current &&
      canvasRef.current &&
      contextRef.current
    ) {
      circlesRef.current.length = 0;
      canvasSizeRef.current.w = canvasContainerRef.current.offsetWidth;
      canvasSizeRef.current.h = canvasContainerRef.current.offsetHeight;
      dprRef.current = Math.min(
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        2,
      );
      const dpr = dprRef.current;
      canvasRef.current.width = canvasSizeRef.current.w * dpr;
      canvasRef.current.height = canvasSizeRef.current.h * dpr;
      canvasRef.current.style.width = `${canvasSizeRef.current.w}px`;
      canvasRef.current.style.height = `${canvasSizeRef.current.h}px`;
      contextRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function drawCircle(circle, update = false) {
    const ctx = contextRef.current;
    if (!ctx) return;

    const {x, y, translateX, translateY, size: sz, alpha} = circle;
    const dpr = dprRef.current;
    ctx.translate(translateX, translateY);
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(${rgb.join(', ')}, ${alpha})`;
    ctx.fill();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!update) {
      circlesRef.current.push(circle);
    }
  }

  function clearContext() {
    const ctx = contextRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, canvasSizeRef.current.w, canvasSizeRef.current.h);
    }
  }

  function drawParticles() {
    clearContext();
    const particleCount = quantity;
    for (let i = 0; i < particleCount; i += 1) {
      const circle = circleParams();
      drawCircle(circle);
    }
  }

  function animate() {
    clearContext();
    const list = circlesRef.current;
    const {w, h} = canvasSizeRef.current;

    for (let i = list.length - 1; i >= 0; i -= 1) {
      const circle = list[i];

      const edge = [
        circle.x + circle.translateX - circle.size,
        w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = Number.parseFloat(
        remapValue(closestEdge, 0, 20, 0, 1).toFixed(2),
      );
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) {
          circle.alpha = circle.targetAlpha;
        }
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX +=
        (mouseRef.current.x / (staticity / circle.magnetism) -
          circle.translateX) /
        ease;
      circle.translateY +=
        (mouseRef.current.y / (staticity / circle.magnetism) -
          circle.translateY) /
        ease;

      drawCircle(circle, true);

      if (
        circle.x < -circle.size ||
        circle.x > w + circle.size ||
        circle.y < -circle.size ||
        circle.y > h + circle.size
      ) {
        list.splice(i, 1);
        const newCircle = circleParams();
        drawCircle(newCircle);
      }
    }
    animationRef.current = window.requestAnimationFrame(animate);
  }

  return (
    <div
      ref={canvasContainerRef}
      className={clsx(className)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
