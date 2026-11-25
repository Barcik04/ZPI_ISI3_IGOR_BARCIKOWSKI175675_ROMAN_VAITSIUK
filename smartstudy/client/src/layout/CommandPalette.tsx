import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, FilePlus2, LogOut, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/misc';
import { SubjectIcon } from '@/components/Decor';
import { NAV_FLAT } from './nav';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const { paletteOpen: open, setPaletteOpen: setOpen, subjects, handleReport, logout } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const go = (to: string) => () => nav(to);
  const cmds: Cmd[] = useMemo(
    () => [
      { id: 'replan', group: 'Akcje', label: 'Przelicz plan nauki', hint: 'AI ułoży harmonogram od nowa', icon: <RefreshCw className="h-4 w-4" />,
        run: () => api.generatePlan().then((r) => { handleReport(r); toast.success('Plan przeliczony', { description: `${r.totalSessions} sesji w planie` }); }) },
      { id: 'note', group: 'Akcje', label: 'Nowa notatka', icon: <FilePlus2 className="h-4 w-4" />, run: go('/app/notes?new=1') },
      { id: 'wizard', group: 'Akcje', label: 'Nowy przedmiot z AI', hint: 'Kreator planu', icon: <Sparkles className="h-4 w-4" />, run: go('/app/wizard') },
      ...NAV_FLAT.map((n) => ({ id: n.to, group: 'Nawigacja', label: n.label, hint: n.hint, icon: <n.icon className="h-4 w-4" />, run: go(n.to) })),
      ...subjects.map((s) => ({ id: s.id, group: 'Przedmioty', label: s.name, hint: `${s.examType} · ${s.daysLeft >= 0 ? `za ${s.daysLeft} dni` : 'zakończony'}`, icon: <SubjectIcon icon={s.icon} color={s.color} size="sm" className="h-6 w-6 rounded-md" />, run: go(`/app/subjects?id=${s.id}`) })),
      { id: 'logout', group: 'Konto', label: 'Wyloguj się', icon: <LogOut className="h-4 w-4" />, run: () => logout() },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjects],
  );

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? cmds.filter((c) => (c.label + ' ' + (c.hint ?? '')).toLowerCase().includes(n)) : cmds;
  }, [q, cmds]);

  useEffect(() => setIdx(0), [q]);

  const exec = (c?: Cmd) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="glass-strong relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(filtered.length - 1, i + 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
                  if (e.key === 'Enter') exec(filtered[idx]);
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Szukaj stron, przedmiotów, akcji…"
                className="h-14 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
              />
              <Kbd>ESC</Kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {!filtered.length && <p className="px-3 py-8 text-center text-sm text-zinc-500">Brak wyników dla „{q}”</p>}
              {filtered.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <div key={c.id}>
                    {header && <div className="label px-3 pb-1 pt-3">{header}</div>}
                    <button
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => exec(c)}
                      className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition', i === idx ? 'text-white' : 'text-zinc-400')}
                    >
                      {i === idx && <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-xl border border-violet-400/20 bg-violet-500/10" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                      <span className="relative text-zinc-400">{c.icon}</span>
                      <span className="relative flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="relative hidden truncate text-xs text-zinc-500 sm:block">{c.hint}</span>}
                      {i === idx && <CornerDownLeft className="relative h-3.5 w-3.5 text-zinc-500" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2.5 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> wybór</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> otwórz</span>
              <span className="ml-auto flex items-center gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
