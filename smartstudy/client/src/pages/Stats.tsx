import { motion } from 'framer-motion';
import { Activity, BarChart3, Brain, CalendarRange, Clock3, Flame, FlaskConical, PieChart as PieIcon, Target, Trophy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartTooltip, GradientDefs } from '@/components/charts';
import { SubjectIcon } from '@/components/Decor';
import { Card, CardHeader } from '@/components/ui/Card';
import { AnimatedNumber, Badge, PageHeader, ProgressBar, Skeleton } from '@/components/ui/misc';
import { useLive } from '@/context/AppContext';
import { api } from '@/lib/api';
import { cn, fmt, minutes } from '@/lib/utils';

export default function Stats() {
  const { data: s } = useLive(() => api.stats());
  const [hover, setHover] = useState<{ date: string; minutes: number } | null>(null);

  if (!s) return <div className="space-y-6"><Skeleton className="h-20 w-80" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-64" /></div>;

  const max = Math.max(1, ...s.heatmap.map((h) => h.minutes));
  const weeks: { date: string; minutes: number }[][] = [];
  s.heatmap.forEach((d, i) => { if (i % 7 === 0) weeks.push([]); weeks[weeks.length - 1].push(d); });
  const radar = s.perSubject.filter((p) => p.daysLeft >= 0).map((p) => ({ subject: p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name, Postęp: p.progress, Opanowanie: p.mastery }));
  const level = (m: number) => (m === 0 ? 0 : m < max * 0.25 ? 1 : m < max * 0.5 ? 2 : m < max * 0.75 ? 3 : 4);
  const COLORS = ['rgba(255,255,255,.04)', 'rgba(139,92,246,.3)', 'rgba(139,92,246,.55)', 'rgba(167,139,250,.8)', '#22d3ee'];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<><BarChart3 className="h-3.5 w-3.5" />Analityka</>} title="Statystyki" subtitle="Twoje postępy, nawyki i skuteczność planu – dane potrzebne do weryfikacji hipotez z TRL I." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile icon={<Clock3 />} c="#22d3ee" l="Łączny czas nauki" v={<AnimatedNumber value={Math.round(s.totalMinutes / 6) / 10} decimals={1} suffix=" h" />} sub={`${s.sessionsDone} ukończonych sesji`} />
        <Tile icon={<Flame />} c="#fb923c" l="Najdłuższa seria" v={<AnimatedNumber value={s.bestStreak} suffix=" dni" />} sub={`Obecna: ${s.streak} dni`} />
        <Tile icon={<Target />} c="#a78bfa" l="Realizacja planu" v={<AnimatedNumber value={s.completionRate} suffix="%" />} sub={`${s.sessionsMissed} opuszczonych sesji`} />
        <Tile icon={<Brain />} c="#34d399" l="Powtórki" v={<AnimatedNumber value={s.reviewsDone} />} sub={`Śr. opanowanie ${s.avgMastery}%`} />
      </div>

      <Card className="p-6">
        <CardHeader title="Mapa aktywności" subtitle="Ostatnie 18 tygodni" icon={<CalendarRange className="h-4 w-4" />}
          action={<div className="hidden text-right text-xs text-zinc-400 sm:block">{hover ? <><b className="text-white">{minutes(hover.minutes)}</b> · {fmt(hover.date, 'EEEE, d MMM')}</> : 'Najedź na dzień'}</div>} />
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-[5px]">
            <div className="mr-1 grid grid-rows-7 gap-[5px] text-[10px] text-zinc-600">{['Pn', '', 'Śr', '', 'Pt', '', 'Nd'].map((d, i) => <span key={i} className="h-[18px] leading-[18px]">{d}</span>)}</div>
            {weeks.map((w, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-[5px]">
                {w.map((d, di) => (
                  <motion.div key={d.date} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (wi * 7 + di) * 0.003 }}
                    onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}
                    className="h-[18px] w-[18px] rounded-[5px] ring-white/40 transition hover:ring-1"
                    style={{ background: COLORS[level(d.minutes)], boxShadow: level(d.minutes) === 4 ? '0 0 8px rgba(34,211,238,.6)' : undefined }} title={`${d.date}: ${d.minutes} min`} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-zinc-500">mniej{COLORS.map((c, i) => <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)}więcej</div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Krzywa zapominania" subtitle="Model: bez powtórek vs powtórki 1·3·7 (ilustracja)" icon={<Activity className="h-4 w-4" />} action={<Badge>hipoteza H2</Badge>} />
          <div className="mt-6 h-64">
            <ResponsiveContainer>
              <AreaChart data={s.retention}>
                {GradientDefs()}
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d) => `d${d}`} axisLine={false} tickLine={false} />
                <YAxis unit="%" axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip format={(l) => `Dzień ${l}`} />} />
                <Area type="monotone" dataKey="bez" name="Bez powtórek %" stroke="#71717a" strokeWidth={2} fill="url(#gAreaGray)" />
                <Area type="monotone" dataKey="smart" name="SmartStudy %" stroke="url(#gLine)" strokeWidth={3} fill="url(#gAreaViolet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Obciążenie planu" subtitle="Najbliższe 14 dni vs Twoja dostępność" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="mt-6 h-64">
            <ResponsiveContainer>
              <BarChart data={s.next14} barCategoryGap="20%">
                {GradientDefs()}
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => fmt(d, 'd.MM')} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip format={(l) => fmt(String(l), 'EEEE, d MMM')} />} />
                <Bar dataKey="capacity" name="Dostępność (min)" fill="rgba(255,255,255,.06)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="learn" name="Nauka (min)" stackId="p" fill="url(#gViolet)" />
                <Bar dataKey="review" name="Powtórki (min)" stackId="p" fill="url(#gCyan)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <CardHeader title="Przedmioty" subtitle="Postęp materiału i czas nauki" icon={<Trophy className="h-4 w-4" />} />
          <div className="mt-5 space-y-4">
            {s.perSubject.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="grid items-center gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <SubjectIcon icon={p.icon} color={p.color} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{p.name}</div>
                    <div className="text-[11px] text-zinc-500">{p.daysLeft >= 0 ? `egzamin za ${p.daysLeft} dni` : 'zakończony'} · {p.learnedTopics}/{p.topics} tematów</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><span className="w-20 text-[10px] text-zinc-500">materiał</span><ProgressBar value={p.progress} color={p.color} /><span className="w-9 text-right font-mono text-[10px] text-zinc-400">{p.progress}%</span></div>
                  <div className="flex items-center gap-2"><span className="w-20 text-[10px] text-zinc-500">opanowanie</span><ProgressBar value={p.mastery} color="#34d399" /><span className="w-9 text-right font-mono text-[10px] text-zinc-400">{p.mastery}%</span></div>
                </div>
                <div className="text-right text-xs text-zinc-400"><b className="text-white">{minutes(p.studiedMinutes)}</b><div className="text-[10px] text-zinc-600">+{minutes(p.plannedMinutes)} w planie</div></div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Balans przedmiotów" subtitle="Aktywne przedmioty" icon={<PieIcon className="h-4 w-4" />} />
          <div className="mt-2 h-64">
            {radar.length >= 3 ? (
              <ResponsiveContainer>
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <Radar name="Postęp" dataKey="Postęp" stroke="#a78bfa" fill="#8b5cf6" fillOpacity={0.35} />
                  <Radar name="Opanowanie" dataKey="Opanowanie" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <p className="grid h-full place-items-center text-sm text-zinc-500">Potrzeba min. 3 aktywnych przedmiotów</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6">
          <CardHeader title="Pora dnia" subtitle="Kiedy uczysz się najwięcej" icon={<Clock3 className="h-4 w-4" />} />
          <div className="mt-6 h-52">
            <ResponsiveContainer>
              <BarChart data={s.timeOfDay} layout="vertical" barCategoryGap="25%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="key" axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="minutes" name="Minuty" radius={[0, 8, 8, 0]}>
                  {s.timeOfDay.map((_, i) => <Cell key={i} fill={['#fbbf24', '#fb923c', '#a78bfa', '#6366f1'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <CardHeader title="Dni tygodnia" subtitle="Rozkład nauki" icon={<CalendarRange className="h-4 w-4" />} />
          <div className="mt-6 h-52">
            <ResponsiveContainer>
              <LineChart data={s.byWeekday}>
                {GradientDefs()}
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="minutes" name="Minuty" stroke="url(#gLine)" strokeWidth={3} dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <CardHeader title="Hipotezy z TRL I" subtitle="Status weryfikacji" icon={<FlaskConical className="h-4 w-4" />} />
          <div className="mt-5 space-y-3 text-sm">
            {[
              ['H1', 'Plan AI lepiej rozkłada materiał (~20%)', 'do zweryfikowania'],
              ['H2', 'Powtórki zwiększają zapamiętywanie (~30%)', 'wymaga badań z użytkownikami'],
              ['H3', 'Dynamiczna korekta zmniejsza zaległości', `zbieramy dane: ${s.sessionsMissed} zaległości`],
              ['H4', 'Prosty interfejs → regularność', `seria ${s.streak} dni`],
            ].map(([k, t, st]) => (
              <div key={k} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <span className="font-mono text-xs font-bold text-violet-300">{k}</span>
                <div><div className="text-zinc-200">{t}</div><div className="text-[11px] text-zinc-500">{st}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Tile({ icon, c, l, v, sub }: { icon: ReactNode; c: string; l: string; v: ReactNode; sub: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full opacity-25 blur-2xl" style={{ background: c }} />
      <div className={cn('mb-3 grid h-9 w-9 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4')} style={{ color: c, background: `${c}1a`, border: `1px solid ${c}33` }}>{icon}</div>
      <div className="label">{l}</div>
      <div className="mt-1 font-display text-3xl font-bold text-white">{v}</div>
      <div className="mt-1 text-xs text-zinc-500">{sub}</div>
    </Card>
  );
}
