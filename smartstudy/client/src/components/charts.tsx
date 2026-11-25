import type { ReactNode } from 'react';

export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: ReactNode; format?: (l: ReactNode) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-white">{format ? format(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-zinc-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function GradientDefs() {
  return (
    <defs>
      <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#67e8f9" stopOpacity={1} />
        <stop offset="100%" stopColor="#0891b2" stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="gPink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f9a8d4" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#db2777" stopOpacity={0.4} />
      </linearGradient>
      <linearGradient id="gAreaViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gAreaGray" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#71717a" stopOpacity={0.25} />
        <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
  );
}
