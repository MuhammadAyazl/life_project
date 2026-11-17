'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';

/**
 * 3D hover effect: the content zooms in a little and tilts towards the mouse cursor,
 * then springs back when the mouse leaves. Mouse only (touch scrolling is unaffected)
 * and switched off for people who prefer reduced motion.
 */
export function Tilt({
  children,
  className,
  max = 12, // max tilt in degrees
  scale = 1.08, // zoom while hovering
  perspective = 900,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  perspective?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const s = useSpring(1, spring);

  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    rotateY.set(x * max * 2);
    rotateX.set(-y * max * 2);
    s.set(scale);
  };
  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    s.set(1);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={move}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, scale: s, transformPerspective: perspective, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}
