import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Check, Clock, GraduationCap, Play, Repeat2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { Session, Subject } from '@/lib/types';
import { celebrate, cn } from '@/lib/utils';

const TYPE = {
  learn: { label: 'Nauka', icon: GraduationCap },
  review: { label: 'Powtórka', icon: Repeat2 },
  final: { label: 'Generalna', icon: Brain },
};

export function SessionItem({ s, subject, onChange, compact, index = 0 }: { s: Session; subject?: Subject; onChange?: (s: Session) => void; compact?: boolean; index?: number }) {
  const { handleReport } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const color = subject?.color ?? '#8b5cf6';
  const T = TYPE[s.type];

  const set = async (status: Session['status']) => {
    setBusy(true);
    try {
      const res = await api.updateSession(s.id, status);
      onChange?.(res.session);
      if (status === 'done') {
        celebrate(0.6);
        toast.success('Sesja zaliczona! 🎯', { description: s.title });
        handleReport(null, { silent: true });
      } else if (status === 'missed') {
        toast.info('Sesja oznaczona jako opuszczona', { description: res.report ? `Plan przeliczony automatycznie · ${res.report.totalSessions} sesji` : undefined });
        handleReport(res.report);
      } else handleReport(null, { silent: true });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 transition-colors',
        s.status === 'done' ? 'border-emerald-400/10 bg-emerald-400/[0.03]' : s.status === 'missed' ? 'border-rose-400/10 bg-rose-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color, boxShadow: `0 0 14px ${color}`, opacity: s.status === 'planned' ? 1 : 0.35 }} />
      {!compact && <div className="w-12 pl-2 font-mono text-xs text-zinc-500">{s.startTime}</div>}
      <div className="min-w-0 flex-1 pl-1">
        <div className={cn('truncate text-sm font-medium', s.status === 'done' ? 'text-zinc-500 line-through decoration-zinc-600' : s.status === 'missed' ? 'text-zinc-500' : 'text-zinc-100')}>{s.title}</div>
        <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1" style={{ color: s.status === 'planned' ? color : undefined }}><T.icon className="h-3 w-3" />{T.label}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{s.minutes} min</span>
          {subject && !compact && <><span className="hidden sm:inline">·</span><span className="hidden truncate sm:inline">{subject.name}</span></>}
          {compact && <span className="font-mono">· {s.startTime}</span>}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {s.status === 'planned' ? (
          <motion.div key="actions" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-1">
            <button disabled={busy} onClick={() => nav(`/app/focus?session=${s.id}`)} title="Rozpocznij w trybie skupienia" className="hidden h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-violet-500/15 hover:text-violet-200 sm:grid sm:opacity-0 sm:group-hover:opacity-100"><Play className="h-3.5 w-3.5" /></button>
            <button disabled={busy} onClick={() => set('missed')} title="Opuszczona – przelicz plan" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-rose-500/15 hover:text-rose-300"><X className="h-4 w-4" /></button>
            <button disabled={busy} onClick={() => set('done')} title="Zrobione" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-emerald-400/40 hover:bg-emerald-400/15 hover:text-emerald-300"><Check className="h-4 w-4" /></button>
          </motion.div>
        ) : s.status === 'done' ? (
          <motion.div key="done" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/20 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,.35)]">
            <Check className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.button key="missed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => set('planned')} disabled={busy} className="rounded-lg px-2 py-1 text-[11px] text-rose-300/80 transition hover:bg-white/5 hover:text-white" title="Przywróć">
            opuszczona
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
