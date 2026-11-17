'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

/** Smooth line + area chart drawn in SVG; the line animates in left to right. */
export function LineChart({ data, label }: { data: { date: string; orders: number }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800,
    H = 300,
    L = 44,
    R = 16,
    T = 16,
    B = 36;
  const pw = W - L - R,
    ph = H - T - B;
  const max = Math.max(4, Math.ceil(Math.max(...data.map((d) => d.orders)) / 2) * 2);
  const pts = data.map((d, i) => [L + (pw * i) / Math.max(1, data.length - 1), T + ph * (1 - d.orders / max)] as const);

  // Catmull-Rom → cubic Bézier for a smooth curve
  let path = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i - 1] ?? pts[i],
      b = pts[i],
      c = pts[i + 1],
      d = pts[i + 2] ?? c;
    path += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (d[0] - b[0]) / 6},${c[1] - (d[1] - b[1]) / 6} ${c[0]},${c[1]}`;
  }
  const area = `${path} L${pts[pts.length - 1][0]},${T + ph} L${L},${T + ph}Z`;
  const ticks = Array.from({ length: 5 }, (_, i) => (max / 4) * i);

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full overflow-visible">
        {ticks.map((t) => {
          const y = T + ph * (1 - t / max);
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 4" />
              <text x={L - 10} y={y + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={d.date} x={pts[i][0]} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">
              {d.date.slice(5)}
            </text>
          ) : null,
        )}
        <motion.path d={area} fill="var(--brand)" initial={{ opacity: 0 }} animate={{ opacity: 0.18 }} transition={{ duration: 1.2, delay: 0.6 }} />
        <motion.path
          d={path}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {hover !== null && (
          <>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={T} y2={T + ph} stroke="var(--line)" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2.5} />
          </>
        )}
        <rect
          x={L}
          y={T}
          width={pw}
          height={ph}
          fill="transparent"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
            const x = ((e.clientX - r.left) * W) / r.width;
            let best = 0;
            pts.forEach((p, i) => Math.abs(p[0] - x) < Math.abs(pts[best][0] - x) && (best = i));
            setHover(best);
          }}
        />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute rounded-lg border border-line bg-surface px-3 py-1.5 text-xs whitespace-nowrap shadow-lg"
          style={{ left: `${(pts[hover][0] / W) * 100}%`, top: `${(pts[hover][1] / H) * 100}%`, transform: 'translate(10px,-120%)' }}
        >
          {data[hover].date}
          <br />
          <b>{data[hover].orders}</b> orders
        </div>
      )}
    </figure>
  );
}
