import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Clock3, LayoutList, ListChecks, Play, Plus, RefreshCw, Scissors, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SubjectIcon } from '@/components/Decor';
import { SessionItem } from '@/components/SessionItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, Modal, PageHeader, Segmented, Skeleton } from '@/components/ui/misc';
import { useApp, useLive } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { Deficit, Session, Subject } from '@/lib/types';
import { addDaysISO, celebrate, cn, fmt, minutes, sessionTypeLabel, todayISO } from '@/lib/utils';

type View = 'week' | 'month' | 'list';

const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const wd = (d.getDay() + 6) % 7;
  return addDaysISO(iso, -wd);
};

export default function PlanPage() {
  const { subjects, report, user, handleReport } = useApp();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(todayISO());
  const [selected, setSelected] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  const range = useMemo(() => {
    if (view === 'week') { const s = mondayOf(anchor); return [s, addDaysISO(s, 6)]; }
    if (view === 'month') {
      const first = anchor.slice(0, 8) + '01';
      const s = mondayOf(first);
      return [s, addDaysISO(s, 41)];
    }
    return [today, addDaysISO(today, 60)];
  }, [view, anchor, today]);

  const { data: sessions, loading, setData } = useLive(() => api.sessions(range[0], range[1]), [range[0], range[1]]);
  const subjMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions ?? []) { if (!m.has(s.date)) m.set(s.date, []); m.get(s.date)!.push(s); }
    return m;
  }, [sessions]);
  const examsByDay = useMemo(() => {
    const m = new Map<string, Subject[]>();
    for (const s of subjects) { if (!m.has(s.examDate)) m.set(s.examDate, []); m.get(s.examDate)!.push(s); }
    return m;
  }, [subjects]);

  const step = (dir: number) => {
    if (view === 'week') setAnchor(addDaysISO(anchor, dir * 7));
    else if (view === 'month') { const d = new Date(`${anchor}T12:00:00`); d.setMonth(d.getMonth() + dir); setAnchor(d.toISOString().slice(0, 10)); }
  };

  const replan = async () => {
    setBusy(true);
    try {
      const r = await api.generatePlan();
      handleReport(r);
      celebrate(0.5);
      toast.success('AI przeliczyło plan', { description: `${r.totalSessions} sesji w ${r.days} dniach` });
    } finally { setBusy(false); }
  };

  const updateLocal = (u: Session) => { setData((sessions ?? []).map((x) => (x.id === u.id ? u : x))); setSelected(null); };

  const title = view === 'week' ? `${fmt(range[0], 'd MMM')} – ${fmt(range[1], 'd MMM yyyy')}` : view === 'month' ? fmt(anchor, 'LLLL yyyy') : 'Najbliższe 60 dni';
  const capacity = user?.settings.availability ?? [];

  return (
    <div>
      <PageHeader eyebrow={<><CalendarDays className="h-3.5 w-3.5" />Moduły 1 · 3 · 4</>} title="Plan nauki" subtitle="Harmonogram ułożony przez AI: nowe tematy przeplatane wg pilności, powtórki 1/3/7 dni i powtórka generalna dzień przed egzaminem."
        actions={<Button onClick={replan} loading={busy} icon={<RefreshCw className="h-4 w-4" />}>Przelicz plan</Button>} />

      {report && <ReportPanel report={report} />}

      <Card className="mt-6 p-4 sm:p-6" spotlight={false}>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {view !== 'list' && <>
              <Button variant="secondary" size="icon" onClick={() => step(-1)} aria-label="Wstecz"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="secondary" size="icon" onClick={() => step(1)} aria-label="Dalej"><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(today)}>Dziś</Button>
            </>}
            <h2 className="ml-2 text-lg font-semibold capitalize">{title}</h2>
          </div>
          <Segmented value={view} onChange={setView} layoutId="plan-view" options={[
            { value: 'week', label: <><CalendarRange className="h-3.5 w-3.5" />Tydzień</> },
            { value: 'month', label: <><CalendarDays className="h-3.5 w-3.5" />Miesiąc</> },
            { value: 'list', label: <><LayoutList className="h-3.5 w-3.5" />Lista</> },
          ]} />
        </div>

        {loading && !sessions ? <Skeleton className="h-[480px]" /> : (
          <AnimatePresence mode="wait">
            <motion.div key={view + range[0]} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              {view === 'week' && <WeekView start={range[0]} byDay={byDay} exams={examsByDay} subjMap={subjMap} capacity={capacity} onPick={setSelected} />}
              {view === 'month' && <MonthView start={range[0]} anchor={anchor} byDay={byDay} exams={examsByDay} subjMap={subjMap} onDay={(d) => { setAnchor(d); setView('week'); }} />}
              {view === 'list' && <ListView byDay={byDay} exams={examsByDay} subjMap={subjMap} onChange={updateLocal} />}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.06] pt-4">
          {subjects.filter((s) => s.daysLeft >= 0).map((s) => (
            <span key={s.id} className="flex items-center gap-2 text-xs text-zinc-400"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />{s.name}</span>
          ))}
        </div>
      </Card>

      <SessionModal s={selected} subject={selected ? subjMap.get(selected.subjectId) : undefined} onClose={() => setSelected(null)} onChange={updateLocal} />
    </div>
  );
}

function ReportPanel({ report }: { report: NonNullable<ReturnType<typeof useApp>['report']> }) {
  const stats = [
    { l: 'Sesji w planie', v: report.totalSessions, icon: ListChecks },
    { l: 'Nowy materiał', v: minutes(report.learnMinutes), icon: Sparkles },
    { l: 'Powtórki', v: minutes(report.reviewMinutes), icon: RefreshCw },
    { l: 'Horyzont', v: `${report.days} dni`, icon: Clock3 },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <Card className={cn('relative overflow-hidden p-5', !report.feasible && 'border-amber-400/25')}>
        <div className={cn('absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl', report.feasible ? 'bg-emerald-500/15' : 'bg-amber-500/20')} />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className={cn('grid h-14 w-14 place-items-center rounded-2xl border', report.feasible ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300')}>
              {report.feasible ? <ShieldCheck className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{report.feasible ? 'Plan jest wykonalny' : 'Plan wymaga Twojej decyzji'}</div>
              <div className="text-xs text-zinc-500">Wygenerowano {fmt(report.generatedAt.slice(0, 10), 'd MMM')} o {new Date(report.generatedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                {report.autoMissed > 0 && ` · ${report.autoMissed} zaległych sesji rozłożono ponownie`}</div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500"><s.icon className="h-3 w-3" />{s.l}</div>
                <div className="mt-0.5 font-display text-lg font-semibold text-white">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      {!report.feasible && (
        <div className="space-y-4 lg:col-span-2">
          {report.deficits.map((d) => <DeficitCard key={d.subjectId} d={d} />)}
        </div>
      )}
    </div>
  );
}

function DeficitCard({ d }: { d: Deficit }) {
  const { handleReport, setUser } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (k: string, fn: () => Promise<void>) => { setBusy(k); try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); } };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
        <span className="font-semibold text-white">{d.subject}</span>
        <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-200">brakuje {minutes(d.deficitMinutes)}</Badge>
        <span className="text-xs text-zinc-500">egzamin {fmt(d.examDate, 'd MMMM')}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">Nie zmieszczą się: <span className="text-zinc-300">{d.unscheduledTopics.join(', ')}</span>. Wybierz, co zrobić – nie przedstawimy niewykonalnego planu jako wykonalnego.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Option icon={<Plus className="h-4 w-4" />} title={`+${d.suggestions.extraPerDay} min dziennie`} text="Zwiększ dostępny czas nauki we wszystkie dni." loading={busy === 'time'}
          onClick={() => run('time', async () => { const r = await api.extraTime(d.suggestions.extraPerDay); setUser(r.user); handleReport(r.report); toast.success('Dodano czas – plan przeliczony'); })} />
        <Option icon={<Scissors className="h-4 w-4" />} title="Ogranicz zakres" text={`Pomiń: ${d.suggestions.dropTopics.slice(0, 3).join(', ')}${d.suggestions.dropTopics.length > 3 ? '…' : ''}`} loading={busy === 'scope'}
          onClick={() => run('scope', async () => { const r = await api.skipTopics(d.subjectId, d.suggestions.dropTopics); handleReport(r.report); toast.success(`Pominięto ${r.skipped} tematy`, { description: 'Możesz je przywrócić w zakładce Przedmioty.' }); })} />
        <Option icon={<RefreshCw className="h-4 w-4" />} title="Zmień priorytety" text="Dostosuj trudność i czas tematów ręcznie." onClick={() => nav(`/app/subjects?id=${d.subjectId}`)} />
      </div>
    </motion.div>
  );
}

function Option({ icon, title, text, onClick, loading }: { icon: ReactNode; title: string; text: string; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="group rounded-2xl border border-white/[0.08] bg-ink-900/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-amber-400/[0.06] disabled:opacity-60">
      <div className="flex items-center gap-2 text-sm font-semibold text-white"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-400/15 text-amber-300">{loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}</span>{title}</div>
      <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{text}</p>
    </button>
  );
}

function WeekView({ start, byDay, exams, subjMap, capacity, onPick }: {
  start: string; byDay: Map<string, Session[]>; exams: Map<string, Subject[]>; subjMap: Map<string, Subject>; capacity: number[]; onPick: (s: Session) => void;
}) {
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="grid min-w-[880px] grid-cols-7 gap-2 px-1">
        {days.map((d, di) => {
          const list = byDay.get(d) ?? [];
          const planned = list.filter((s) => s.status !== 'missed').reduce((a, s) => a + s.minutes, 0);
          const cap = capacity[new Date(`${d}T12:00:00`).getDay()] ?? 0;
          const isToday = d === today;
          const past = d < today;
          return (
            <motion.div key={d} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.04 }}
              className={cn('flex min-h-[440px] flex-col rounded-2xl border p-2', isToday ? 'border-violet-400/30 bg-violet-500/[0.06] shadow-[inset_0_0_40px_rgba(139,92,246,.08)]' : 'border-white/[0.05] bg-white/[0.015]', past && 'opacity-70')}>
              <div className="mb-2 px-1.5 pt-1">
                <div className="flex items-baseline justify-between">
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wider', isToday ? 'text-violet-300' : 'text-zinc-500')}>{fmt(d, 'EEE')}</span>
                  <span className={cn('font-display text-xl font-semibold', isToday ? 'text-white' : 'text-zinc-300')}>{fmt(d, 'd')}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]" title={`${planned} / ${cap} min`}>
                  <div className={cn('h-full rounded-full', planned > cap ? 'bg-amber-400' : 'bg-gradient-to-r from-violet-500 to-cyan-400')} style={{ width: `${cap ? Math.min(100, (planned / cap) * 100) : 0}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-zinc-600">{planned} / {cap} min</div>
              </div>
              {(exams.get(d) ?? []).map((s) => (
                <div key={s.id} className="mb-1.5 rounded-xl border p-2 text-[11px] font-semibold" style={{ borderColor: `${s.color}66`, background: `repeating-linear-gradient(135deg, ${s.color}22 0 6px, transparent 6px 12px)`, color: s.color }}>
                  🎓 {s.examType.toUpperCase()}: {s.name}
                </div>
              ))}
              <div className="flex-1 space-y-1.5">
                {list.map((s) => {
                  const subj = subjMap.get(s.subjectId);
                  const c = subj?.color ?? '#8b5cf6';
                  return (
                    <motion.button key={s.id} layout whileHover={{ y: -2 }} onClick={() => onPick(s)}
                      className={cn('relative w-full overflow-hidden rounded-xl border p-2 text-left transition', s.status === 'missed' && 'opacity-40', s.status === 'done' && 'opacity-60')}
                      style={{ borderColor: `${c}33`, background: `linear-gradient(135deg, ${c}22, ${c}08)`, minHeight: Math.max(44, s.minutes * 0.9) }}>
                      <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: c }} />
                      <div className="flex items-center justify-between gap-1 text-[10px] font-medium" style={{ color: c }}>
                        <span className="font-mono">{s.startTime}</span>
                        {s.status === 'done' ? <Check className="h-3 w-3 text-emerald-300" /> : s.status === 'missed' ? <X className="h-3 w-3 text-rose-300" /> : <span className="opacity-70">{s.minutes}′</span>}
                      </div>
                      <div className={cn('mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-100', s.status === 'done' && 'line-through')}>{s.title}</div>
                      {s.type !== 'learn' && <div className="mt-1 text-[9px] uppercase tracking-wider text-zinc-400">{sessionTypeLabel[s.type]}</div>}
                    </motion.button>
                  );
                })}
                {!list.length && !(exams.get(d) ?? []).length && <div className="grid h-24 place-items-center text-[11px] text-zinc-700">—</div>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ start, anchor, byDay, exams, subjMap, onDay }: { start: string; anchor: string; byDay: Map<string, Session[]>; exams: Map<string, Subject[]>; subjMap: Map<string, Subject>; onDay: (d: string) => void }) {
  const today = todayISO();
  const month = anchor.slice(0, 7);
  const days = Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const ex = exams.get(d) ?? [];
          const total = list.reduce((a, s) => a + s.minutes, 0);
          const inMonth = d.startsWith(month);
          return (
            <motion.button key={d} onClick={() => onDay(d)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008 }}
              className={cn('relative flex aspect-square flex-col rounded-xl border p-1.5 text-left transition hover:border-violet-400/40 sm:aspect-[1.15] sm:p-2', d === today ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/[0.05] bg-white/[0.015]', !inMonth && 'opacity-35')}>
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-semibold', d === today ? 'text-violet-200' : 'text-zinc-300')}>{fmt(d, 'd')}</span>
                {total > 0 && <span className="hidden font-mono text-[9px] text-zinc-500 sm:block">{total}′</span>}
              </div>
              {ex.map((s) => <div key={s.id} className="mt-1 truncate rounded-md px-1 text-[9px] font-bold" style={{ background: `${s.color}33`, color: s.color }}>🎓 {s.name}</div>)}
              <div className="mt-auto flex flex-wrap gap-0.5">
                {list.slice(0, 8).map((s) => (
                  <span key={s.id} className={cn('h-1.5 rounded-full', s.type === 'learn' ? 'w-3' : 'w-1.5', s.status === 'missed' && 'opacity-30')} style={{ background: subjMap.get(s.subjectId)?.color ?? '#888' }} />
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ byDay, exams, subjMap, onChange }: { byDay: Map<string, Session[]>; exams: Map<string, Subject[]>; subjMap: Map<string, Subject>; onChange: (s: Session) => void }) {
  const days = [...new Set([...byDay.keys(), ...[...exams.keys()].filter((d) => d >= todayISO())])].sort();
  if (!days.length) return <p className="py-16 text-center text-sm text-zinc-500">Brak zaplanowanych sesji.</p>;
  return (
    <div className="space-y-6">
      {days.map((d) => (
        <div key={d} className="grid gap-3 md:grid-cols-[140px_1fr]">
          <div className="md:sticky md:top-20 md:self-start">
            <div className="font-display text-lg font-semibold capitalize text-white">{fmt(d, 'EEEE')}</div>
            <div className="text-xs text-zinc-500">{fmt(d, 'd MMMM')} {d === todayISO() && <Badge className="ml-1 border-violet-400/30 bg-violet-500/15 text-violet-200">dziś</Badge>}</div>
          </div>
          <div className="space-y-2">
            {(exams.get(d) ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: `${s.color}55`, background: `${s.color}14` }}>
                <SubjectIcon icon={s.icon} color={s.color} size="sm" />
                <div className="text-sm font-semibold" style={{ color: s.color }}>🎓 {s.examType}: {s.name}</div>
              </div>
            ))}
            {(byDay.get(d) ?? []).map((s, i) => <SessionItem key={s.id} s={s} index={i} subject={subjMap.get(s.subjectId)} onChange={onChange} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionModal({ s, subject, onClose, onChange }: { s: Session | null; subject?: Subject; onClose: () => void; onChange: (s: Session) => void }) {
  const nav = useNavigate();
  const topic = subject?.topics.find((t) => t.id === s?.topicId);
  return (
    <Modal open={!!s} onClose={onClose} title={s?.title} subtitle={subject && <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: subject.color }} />{subject.name}</span>}>
      {s && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[['Data', fmt(s.date, 'EEE, d MMM')], ['Godzina', s.startTime], ['Czas', `${s.minutes} min`]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[11px] text-zinc-500">{l}</div>
                <div className="mt-0.5 text-sm font-semibold capitalize text-white">{v}</div>
              </div>
            ))}
          </div>
          {topic && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
              <div className="flex justify-between text-zinc-400"><span>Typ sesji</span><span className="text-white">{sessionTypeLabel[s.type]}{s.reviewIndex != null && ` ${s.reviewIndex + 1}/3`}</span></div>
              <div className="mt-2 flex justify-between text-zinc-400"><span>Trudność tematu</span><span className="text-white">{topic.difficulty}/5</span></div>
              <div className="mt-2 flex justify-between text-zinc-400"><span>Opanowanie</span><span className="text-white">{topic.mastery}%</span></div>
            </div>
          )}
          <SessionItem s={s} subject={subject} onChange={onChange} compact />
          {s.status === 'planned' && <Button className="w-full" onClick={() => nav(`/app/focus?session=${s.id}`)} icon={<Play className="h-4 w-4 fill-current" />}>Rozpocznij w trybie skupienia</Button>}
        </div>
      )}
    </Modal>
  );
}
