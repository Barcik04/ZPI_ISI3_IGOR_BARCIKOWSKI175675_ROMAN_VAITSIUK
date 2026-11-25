import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, BookCheck, Brain, CalendarDays, CheckCircle2, Clock3, Flame, Lightbulb, Play, RefreshCw, Sparkles, Target, TrendingUp, Wand2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { toast } from 'sonner';
import { ChartTooltip, GradientDefs } from '@/components/charts';
import { Markdown, SubjectIcon } from '@/components/Decor';
import { SessionItem } from '@/components/SessionItem';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { AnimatedNumber, EmptyState, ProgressBar, ProgressRing, Skeleton } from '@/components/ui/misc';
import { useApp, useLive } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { Insight } from '@/lib/types';
import { cn, daysLabel, fmt, greeting, minutes } from '@/lib/utils';

const INSIGHT: Record<Insight['type'], { c: string; bg: string }> = {
  tip: { c: 'text-violet-300', bg: 'bg-violet-500/10 border-violet-400/20' },
  info: { c: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-400/20' },
  warn: { c: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-400/20' },
  danger: { c: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-400/20' },
  success: { c: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-400/20' },
};
const INSIGHT_ICON: Record<string, ReactNode> = {
  sparkles: <Sparkles className="h-4 w-4" />, calendar: <CalendarDays className="h-4 w-4" />, alert: <AlertTriangle className="h-4 w-4" />,
  brain: <Brain className="h-4 w-4" />, trending: <TrendingUp className="h-4 w-4" />, flame: <Flame className="h-4 w-4" />,
};

export default function Dashboard() {
  const { user, subjects, handleReport } = useApp();
  const { data, loading, setData } = useLive(() => api.dashboard());
  const [replanning, setReplanning] = useState(false);
  const nav = useNavigate();

  if (loading || !data) return <DashboardSkeleton />;
  const { stats, today, insights, report } = data;
  const subjMap = new Map(subjects.map((s) => [s.id, s]));
  const doneMin = today.filter((s) => s.status === 'done').reduce((a, s) => a + s.minutes, 0);
  const totalMin = today.filter((s) => s.status !== 'missed').reduce((a, s) => a + s.minutes, 0);
  const pct = totalMin ? Math.round((doneMin / totalMin) * 100) : 0;
  const next = today.find((s) => s.status === 'planned');
  const upcoming = subjects.filter((s) => s.daysLeft >= 0).slice(0, 4);
  const first = user?.name.split(' ')[0];

  const replan = async () => {
    setReplanning(true);
    try {
      const r = await api.generatePlan();
      handleReport(r);
      toast.success('Plan przeliczony przez AI', { description: `${r.totalSessions} sesji · ${minutes(r.learnMinutes)} nauki · ${minutes(r.reviewMinutes)} powtórek` });
    } finally {
      setReplanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Powitanie */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="label mb-2 flex items-center gap-2 capitalize"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />{fmt(stats.today, 'EEEE, d MMMM')}</div>
          <h1 className="text-3xl font-semibold sm:text-[42px] sm:leading-tight">
            {greeting()}, <span className="text-gradient">{first}</span> 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            {today.length
              ? <>Masz dziś <b className="text-zinc-200">{today.length}</b> sesji ({minutes(totalMin)}). {next ? <>Następna: <b className="text-zinc-200">{next.title}</b> o {next.startTime}.</> : 'Wszystko zrobione – czas na odpoczynek!'}</>
              : 'Na dziś nic nie zaplanowano. Dodaj przedmiot albo wygeneruj plan w Kreatorze AI.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={replan} loading={replanning} icon={<RefreshCw className="h-4 w-4" />}>Przelicz plan</Button>
          <Button onClick={() => nav('/app/wizard')} icon={<Wand2 className="h-4 w-4" />}>Kreator AI</Button>
        </div>
      </motion.div>

      {report && !report.feasible && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><AlertTriangle className="h-5 w-5" /></div>
            <div className="flex-1 text-sm">
              <div className="font-semibold text-amber-100">Plan nie mieści się w Twoim czasie</div>
              <div className="text-amber-100/70">
                {report.deficits.map((d) => `${d.subject}: brakuje ${minutes(d.deficitMinutes)}`).join(' · ')}. Nie udajemy, że jest inaczej – wybierz jedną z opcji.
              </div>
            </div>
            <Link to="/app/plan"><Button size="sm" variant="secondary">Zobacz opcje <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
        </motion.div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi i={0} icon={<Flame className="h-5 w-5" />} color="#fb923c" label="Seria" value={stats.streak} suffix={` ${stats.streak === 1 ? 'dzień' : 'dni'}`} sub={`Rekord: ${stats.bestStreak} dni`} />
        <Kpi i={1} icon={<Clock3 className="h-5 w-5" />} color="#22d3ee" label="Ten tydzień" value={Math.round((stats.weekMinutes / 60) * 10) / 10} decimals={1} suffix=" h"
          sub={stats.prevWeekMinutes ? `${stats.weekMinutes >= stats.prevWeekMinutes ? '▲' : '▼'} ${Math.abs(Math.round(((stats.weekMinutes - stats.prevWeekMinutes) / stats.prevWeekMinutes) * 100))}% vs poprzedni` : 'Pierwszy tydzień'} />
        <Kpi i={2} icon={<Target className="h-5 w-5" />} color="#a78bfa" label="Realizacja planu" value={stats.completionRate} suffix="%" sub={`${stats.sessionsDone} zrobionych · ${stats.sessionsMissed} opuszczonych`} />
        <Kpi i={3} icon={<BookCheck className="h-5 w-5" />} color="#34d399" label="Opanowane tematy" value={stats.learnedTopics} suffix={` / ${stats.totalTopics}`} sub={`Śr. opanowanie ${stats.avgMastery}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Dziś */}
        <Card className="p-6 xl:col-span-2" delay={0.1}>
          <CardHeader title="Plan na dziś" subtitle={`${today.filter((s) => s.status === 'done').length} z ${today.length} sesji ukończonych`} icon={<CalendarDays className="h-4 w-4" />}
            action={<Link to="/app/plan" className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-white">Cały plan <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-5">
              <ProgressRing value={pct} size={150} stroke={12}>
                <div className="text-center">
                  <div className="font-display text-4xl font-bold text-white"><AnimatedNumber value={pct} suffix="%" /></div>
                  <div className="text-[11px] text-zinc-500">{minutes(doneMin)} / {minutes(totalMin)}</div>
                </div>
              </ProgressRing>
              {next ? (
                <Button size="sm" className="w-full" onClick={() => nav(`/app/focus?session=${next.id}`)} icon={<Play className="h-3.5 w-3.5 fill-current" />}>Rozpocznij sesję</Button>
              ) : today.length ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" />Dzień zaliczony!</div>
              ) : null}
            </div>
            <div className="min-w-0 space-y-2">
              {today.length ? (
                today.map((s, i) => (
                  <SessionItem key={s.id} s={s} index={i} subject={subjMap.get(s.subjectId)} onChange={(u) => setData({ ...data, today: data.today.map((x) => (x.id === u.id ? u : x)) })} />
                ))
              ) : (
                <EmptyState icon={<Sparkles className="h-7 w-7" />} title="Wolne!" text="Nie masz dziś zaplanowanej nauki." action={<Button size="sm" onClick={() => nav('/app/wizard')}>Utwórz plan</Button>} />
              )}
            </div>
          </div>
        </Card>

        {/* Insights */}
        <Card className="p-6" delay={0.15}>
          <CardHeader title="Wskazówki AI" subtitle="Na podstawie Twoich postępów" icon={<Lightbulb className="h-4 w-4" />} />
          <div className="mt-5 space-y-3">
            {insights.length ? insights.map((ins, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className={cn('flex gap-3 rounded-2xl border p-3.5', INSIGHT[ins.type].bg)}>
                <div className={cn('mt-0.5 shrink-0', INSIGHT[ins.type].c)}>{INSIGHT_ICON[ins.icon] ?? <Sparkles className="h-4 w-4" />}</div>
                <Markdown text={ins.text} className="[&_p]:my-0 text-[13px] leading-relaxed" />
              </motion.div>
            )) : <p className="text-sm text-zinc-500">Ucz się dalej, a pojawią się tu spersonalizowane wskazówki.</p>}
          </div>
          <Link to="/app/assistant" className="mt-5 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-gradient-to-r from-violet-500/10 to-cyan-500/5 p-3.5 text-sm transition hover:border-violet-400/30">
            <span className="flex items-center gap-2 text-zinc-200"><Sparkles className="h-4 w-4 text-violet-300" />Zapytaj asystenta</span>
            <ArrowRight className="h-4 w-4 text-zinc-500" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Egzaminy */}
        <Card className="p-6" delay={0.2}>
          <CardHeader title="Nadchodzące egzaminy" subtitle="Odliczanie i postęp" icon={<Target className="h-4 w-4" />} />
          <div className="mt-5 space-y-4">
            {upcoming.length ? upcoming.map((s, i) => (
              <motion.button key={s.id} onClick={() => nav(`/app/subjects?id=${s.id}`)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.06 }} className="block w-full text-left">
                <div className="flex items-center gap-3">
                  <SubjectIcon icon={s.icon} color={s.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-100">{s.name}</div>
                    <div className="text-[11px] capitalize text-zinc-500">{s.examType} · {fmt(s.examDate, 'd MMM')}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn('font-display text-xl font-bold', s.daysLeft <= 5 ? 'text-amber-300' : 'text-white')}>{s.daysLeft}</div>
                    <div className="-mt-1 text-[10px] text-zinc-500">dni</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={s.progress} color={s.color} />
                  <span className="w-9 text-right font-mono text-[11px] text-zinc-400">{s.progress}%</span>
                </div>
              </motion.button>
            )) : <p className="py-6 text-center text-sm text-zinc-500">Brak nadchodzących egzaminów.</p>}
          </div>
        </Card>

        {/* Aktywność */}
        <Card className="p-6 xl:col-span-2" delay={0.25}>
          <CardHeader title="Aktywność i obciążenie" subtitle="Ostatnie 14 dni · nauka vs powtórki" icon={<TrendingUp className="h-4 w-4" />}
            action={<div className="flex gap-3 text-[11px] text-zinc-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-400" />Nauka</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-cyan-400" />Powtórki</span></div>} />
          <div className="mt-6 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last14} barCategoryGap="22%">
                {GradientDefs()}
                <XAxis dataKey="date" tickFormatter={(d) => fmt(d, 'EEEEEE')} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,.03)' }} content={<ChartTooltip format={(l) => fmt(String(l), 'EEEE, d MMM')} />} />
                <Bar dataKey="learn" name="Nauka (min)" stackId="a" fill="url(#gViolet)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="review" name="Powtórki (min)" stackId="a" fill="url(#gCyan)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-xs text-zinc-500">Łącznie od początku: <b className="text-zinc-300">{minutes(stats.totalMinutes)}</b> · {daysLabel(0)} {minutes(doneMin)}</div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, color, label, value, suffix, sub, decimals = 0, i }: { icon: ReactNode; color: string; label: string; value: number; suffix?: string; sub: string; decimals?: number; i: number }) {
  return (
    <Card className="group relative overflow-hidden p-5" delay={i * 0.05}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: color }} />
      <div className="relative flex items-center justify-between">
        <span className="label">{label}</span>
        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ color, background: `${color}1a`, border: `1px solid ${color}33` }}>{icon}</div>
      </div>
      <div className="relative mt-3 font-display text-3xl font-bold text-white"><AnimatedNumber value={value} decimals={decimals} suffix={suffix} /></div>
      <div className="relative mt-1 truncate text-xs text-zinc-500">{sub}</div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full max-w-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      <div className="grid gap-6 xl:grid-cols-3"><Skeleton className="h-96 xl:col-span-2" /><Skeleton className="h-96" /></div>
    </div>
  );
}
