import { AnimatePresence, animate, motion, useInView } from 'framer-motion';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', !color && 'border-white/10 bg-white/[0.05] text-zinc-300', className)}
      style={color ? { color, borderColor: `${color}40`, background: `${color}14` } : undefined}
    >
      {children}
    </span>
  );
}

export function AnimatedNumber({ value, decimals = 0, suffix = '', className }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const prev = useRef(0);
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const c = animate(prev.current, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = v.toFixed(decimals).replace('.', ',') + suffix),
    });
    prev.current = value;
    return () => c.stop();
  }, [value, inView, decimals, suffix]);
  return <span ref={ref} className={cn('tabular-nums', className)}>0{suffix}</span>;
}

export function ProgressRing({
  value, size = 120, stroke = 10, colors = ['#a78bfa', '#22d3ee'], children, track = 'rgba(255,255,255,.06)',
}: { value: number; size?: number; stroke?: number; colors?: [string, string] | string[]; children?: ReactNode; track?: string }) {
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1] ?? colors[0]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#g${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${colors[0]}88)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, color = '#8b5cf6', className, height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-white/[0.06]', className)} style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 12px ${color}88` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export function Modal({ open, onClose, children, title, subtitle, className, wide }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; subtitle?: ReactNode; className?: string; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={cn('glass-strong relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg', className)}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
            {(title || subtitle) && (
              <div className="mb-5 pr-10">
                {title && <h2 className="text-xl font-semibold">{title}</h2>}
                {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
              </div>
            )}
            <button onClick={onClose} aria-label="Zamknij" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-white/[0.04]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/30 blur-2xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-violet-300">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-400">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, layoutId }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; layoutId?: string;
}) {
  const lid = useId();
  return (
    <div className={cn('inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1', className)}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn('relative rounded-lg px-3 py-1.5 text-xs font-medium transition', value === o.value ? 'text-white' : 'text-zinc-400 hover:text-zinc-200')}>
          {value === o.value && <motion.span layoutId={layoutId ?? lid} className="absolute inset-0 rounded-lg bg-white/10 shadow-inner" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full border transition-colors', checked ? 'border-violet-400/50 bg-gradient-to-r from-violet-600 to-cyan-500' : 'border-white/10 bg-white/10')}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  );
}

export function DifficultyDots({ value, onChange, color = '#a78bfa', size = 'sm' }: { value: number; onChange?: (v: number) => void; color?: string; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState<number | null>(null);
  const v = hover ?? value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)} title={`Trudność ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={!onChange} onMouseEnter={() => onChange && setHover(i)} onClick={() => onChange?.(i)}
          className={cn('rounded-full transition-all', size === 'sm' ? 'h-1.5 w-3.5' : 'h-2 w-5', onChange && 'cursor-pointer hover:scale-y-150')}
          style={{ background: i <= v ? color : 'rgba(255,255,255,.1)', boxShadow: i <= v ? `0 0 8px ${color}66` : undefined }}
          aria-label={`Trudność ${i}`}
        />
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, eyebrow, actions }: { title: ReactNode; subtitle?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="label mb-2 flex items-center gap-2">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{children}</kbd>;
}
