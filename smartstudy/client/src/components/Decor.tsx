import { motion } from 'framer-motion';
import {
  Atom, BookOpen, Brain, Briefcase, Code2, Cpu, Database, FlaskConical, Globe, Languages, Network, Palette, Scale, Sigma, type LucideIcon,
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Aurora({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-[#05050a]" />
      <div className="absolute -left-[10%] -top-[20%] h-[60vmax] w-[60vmax] animate-aurora rounded-full bg-violet-600/25 blur-[120px]" style={{ opacity: intensity }} />
      <div className="absolute -right-[15%] top-[10%] h-[50vmax] w-[50vmax] animate-aurora rounded-full bg-cyan-500/15 blur-[120px] [animation-delay:-6s]" style={{ opacity: intensity }} />
      <div className="absolute bottom-[-25%] left-[25%] h-[55vmax] w-[55vmax] animate-aurora rounded-full bg-fuchsia-600/15 blur-[130px] [animation-delay:-12s]" style={{ opacity: intensity }} />
      <div className="grid-bg mask-radial absolute inset-0 opacity-60" />
    </div>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/20 via-ink-900 to-cyan-500/20 shadow-glow">
        <motion.svg viewBox="0 0 64 64" className="h-5 w-5" animate={{ rotate: [0, 90, 90, 180, 180] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.5, 0.7, 1] }}>
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c4b5fd" />
              <stop offset=".5" stopColor="#67e8f9" />
              <stop offset="1" stopColor="#f9a8d4" />
            </linearGradient>
          </defs>
          <path d="M32 4 L38 26 L60 32 L38 38 L32 60 L26 38 L4 32 L26 26 Z" fill="url(#lg)" />
        </motion.svg>
      </div>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          Smart<span className="text-gradient">Study</span>
        </span>
      )}
    </div>
  );
}

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  sigma: Sigma, database: Database, network: Network, briefcase: Briefcase, atom: Atom, book: BookOpen, cpu: Cpu, code: Code2,
  flask: FlaskConical, globe: Globe, brain: Brain, languages: Languages, palette: Palette, scale: Scale,
};

export function SubjectIcon({ icon, color, size = 'md', className }: { icon: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = SUBJECT_ICONS[icon] ?? BookOpen;
  const s = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }[size];
  const i = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }[size];
  return (
    <div className={cn('grid shrink-0 place-items-center border', s, className)} style={{ color, borderColor: `${color}40`, background: `linear-gradient(135deg, ${color}26, ${color}08)`, boxShadow: `0 8px 24px -10px ${color}88` }}>
      <Icon className={i} />
    </div>
  );
}

/** Minimalny renderer markdown: nagłówki, listy, pogrubienie, kursywa, kod. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const inline = (s: string, k: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g).map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={k + i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('_') && p.endsWith('_') && p.length > 2) return <em key={k + i}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={k + i}>{p.slice(1, -1)}</code>;
      return <Fragment key={k + i}>{p}</Fragment>;
    });
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*[-•]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-•]\s+/, ''));
      blocks.push(<ul key={i}>{items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push(<ol key={i}>{items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ol>);
      continue;
    }
    if (l.startsWith('# ')) blocks.push(<h1 key={i}>{inline(l.slice(2), `${i}`)}</h1>);
    else if (l.startsWith('## ')) blocks.push(<h2 key={i}>{inline(l.slice(3), `${i}`)}</h2>);
    else if (l.trim()) blocks.push(<p key={i}>{inline(l, `${i}`)}</p>);
    i++;
  }
  return <div className={cn('prose-note text-sm text-zinc-300', className)}>{blocks}</div>;
}

export function GradientBorder({ children, className, inner }: { children: ReactNode; className?: string; inner?: string }) {
  return (
    <div className={cn('relative rounded-3xl p-px', className)}>
      <div className="absolute inset-0 animate-gradient-x rounded-3xl bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-500 bg-[length:200%_auto] opacity-70" />
      <div className={cn('relative rounded-[23px] bg-ink-900', inner)}>{children}</div>
    </div>
  );
}
