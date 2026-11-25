import { motion } from 'framer-motion';
import { Moon, Sun, Sunrise } from 'lucide-react';
import { useRef } from 'react';
import type { Settings } from '@/lib/types';
import { cn, hoursShort } from '@/lib/utils';

const DAYS = [
  { i: 1, l: 'Pn' }, { i: 2, l: 'Wt' }, { i: 3, l: 'Śr' }, { i: 4, l: 'Cz' }, { i: 5, l: 'Pt' }, { i: 6, l: 'Sb' }, { i: 0, l: 'Nd' },
];
const MAX = 300;

export function AvailabilityBars({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const setFrom = (dayIdx: number, clientY: number) => {
    const el = refs.current[dayIdx];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = 1 - Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    const m = Math.round((ratio * MAX) / 15) * 15;
    const next = [...value];
    next[dayIdx] = m;
    onChange(next);
  };
  const weekly = value.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex h-56 items-end gap-2 sm:gap-3">
        {DAYS.map((d) => {
          const m = value[d.i] ?? 0;
          return (
            <div key={d.i} className="flex h-full flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-400">{hoursShort(m)}</span>
              <div
                ref={(el) => (refs.current[d.i] = el)}
                className="relative w-full flex-1 cursor-ns-resize touch-none overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setFrom(d.i, e.clientY); }}
                onPointerMove={(e) => e.buttons === 1 && setFrom(d.i, e.clientY)}
                role="slider" aria-label={`Dostępność ${d.l}`} aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={m} tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = [...value];
                    next[d.i] = Math.max(0, Math.min(MAX, m + (e.key === 'ArrowUp' ? 15 : -15)));
                    onChange(next);
                  }
                }}
              >
                {[0.25, 0.5, 0.75].map((y) => <div key={y} className="absolute inset-x-0 border-t border-dashed border-white/[0.05]" style={{ bottom: `${y * 100}%` }} />)}
                <motion.div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-gradient-to-t from-violet-600/70 via-fuchsia-500/60 to-cyan-400/80"
                  animate={{ height: `${(m / MAX) * 100}%` }} transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  style={{ boxShadow: '0 -6px 24px rgba(139,92,246,.45)' }}>
                  <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/60" />
                </motion.div>
              </div>
              <span className={cn('text-xs font-semibold', d.i === 0 || d.i === 6 ? 'text-pink-300' : 'text-zinc-400')}>{d.l}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>Przeciągnij słupek, by ustawić minuty (krok 15 min)</span>
        <span>Tygodniowo: <b className="text-white">{hoursShort(weekly)}</b></span>
      </div>
    </div>
  );
}

export function PreferredTime({ value, onChange }: { value: Settings['preferredTime']; onChange: (v: Settings['preferredTime']) => void }) {
  const opts = [
    { v: 'morning' as const, l: 'Rano', d: 'od 8:00', icon: Sunrise, c: '#fbbf24' },
    { v: 'afternoon' as const, l: 'Popołudnie', d: 'od 14:00', icon: Sun, c: '#fb923c' },
    { v: 'evening' as const, l: 'Wieczór', d: 'od 18:00', icon: Moon, c: '#a78bfa' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => (
        <button type="button" key={o.v} onClick={() => onChange(o.v)}
          className={cn('relative overflow-hidden rounded-2xl border p-3 text-left transition', value === o.v ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.06] hover:border-white/15')}>
          {value === o.v && <motion.div layoutId="pref-time" className="absolute inset-0 -z-0" style={{ background: `radial-gradient(circle at 20% 0%, ${o.c}33, transparent 70%)` }} />}
          <o.icon className="relative h-5 w-5" style={{ color: o.c }} />
          <div className="relative mt-2 text-sm font-semibold text-white">{o.l}</div>
          <div className="relative text-[11px] text-zinc-500">{o.d}</div>
        </button>
      ))}
    </div>
  );
}
