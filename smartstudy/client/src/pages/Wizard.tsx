import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CalendarCheck2, CheckCircle2, Clock3, Crown, ListPlus, Rocket, ScanText, Sparkles, Wand2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Analyzer, type EditableTopic } from '@/components/Analyzer';
import { AvailabilityBars, PreferredTime } from '@/components/Availability';
import { SUBJECT_ICONS, SubjectIcon } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber, Segmented } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { api, ApiError } from '@/lib/api';
import type { PlanReport, Settings } from '@/lib/types';
import { addDaysISO, celebrate, cn, fmt, minutes, SUBJECT_COLORS, todayISO } from '@/lib/utils';

const STEPS = [
  { t: 'Przedmiot', d: 'Co i kiedy zdajesz', icon: BookOpen },
  { t: 'Materiał', d: 'AI rozpozna tematy', icon: ScanText },
  { t: 'Dostępność', d: 'Ile masz czasu', icon: Clock3 },
  { t: 'Plan', d: 'Generowanie', icon: Rocket },
];

export default function Wizard() {
  const { user, setUser, handleReport } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState(addDaysISO(todayISO(), 14));
  const [examType, setExamType] = useState('egzamin');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState('book');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [topics, setTopics] = useState<EditableTopic[]>([]);
  const [manual, setManual] = useState('');
  const [settings, setSettings] = useState<Settings>(user!.settings);
  const [phase, setPhase] = useState(0);
  const [report, setReport] = useState<PlanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finalTopics = mode === 'ai'
    ? topics.filter((t) => t.selected && t.title.trim()).map(({ title, difficulty, estMinutes }) => ({ title, difficulty, estMinutes }))
    : manual.split('\n').map((l) => l.trim()).filter(Boolean).map((title) => ({ title, difficulty: 3, estMinutes: 45 }));

  const canNext = [name.trim().length > 1 && examDate > todayISO(), finalTopics.length > 0, settings.availability.some((m) => m > 0), true][step];
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); };

  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    setPhase(0); setReport(null); setError(null);
    (async () => {
      try {
        const tick = (p: number) => new Promise((r) => setTimeout(() => { if (!cancelled) setPhase(p); r(null); }, 650));
        const u = await api.updateMe({ settings });
        setUser(u.user);
        await tick(1);
        const r = await api.createSubject({ name, examDate, examType, color, icon, topics: finalTopics });
        await tick(2);
        await tick(3);
        if (cancelled) return;
        handleReport(r.report, { silent: true });
        setReport(r.report);
        setPhase(4);
        if (r.report?.feasible) celebrate(2);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError && e.status === 402 ? 'paywall' : (e as Error).message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const deficit = report?.deficits.find((d) => d.subject === name);

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <div className="label mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-violet-200"><Wand2 className="h-3.5 w-3.5" />Kreator planu AI</div>
        <h1 className="text-3xl font-semibold sm:text-5xl">Twój plan w <span className="text-gradient-animated">4 krokach</span></h1>
      </motion.div>

      {/* Stepper */}
      <div className="mb-8 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <button key={s.t} disabled={i > step || step === 3} onClick={() => go(i)} className="group text-left">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400" initial={false} animate={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }} transition={{ duration: 0.5 }} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition', i < step ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : i === step ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/10 text-zinc-600')}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
              </span>
              <div className="hidden min-w-0 sm:block">
                <div className={cn('truncate text-sm font-medium', i <= step ? 'text-white' : 'text-zinc-600')}>{s.t}</div>
                <div className="truncate text-[11px] text-zinc-500">{s.d}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card className="relative overflow-hidden p-6 sm:p-8" spotlight={false}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.3 }}>
            {step === 0 && (
              <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold">Do czego się przygotowujesz?</h2>
                  <label className="block"><span className="label mb-2 block">Nazwa przedmiotu</span><input autoFocus className="input text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Algorytmy i struktury danych" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="label mb-2 block">Data</span><input type="date" className="input [color-scheme:dark]" min={addDaysISO(todayISO(), 1)} value={examDate} onChange={(e) => setExamDate(e.target.value)} /></label>
                    <div><span className="label mb-2 block">Forma</span><Segmented value={examType} onChange={setExamType} className="w-full" options={['egzamin', 'kolokwium', 'zaliczenie'].map((v) => ({ value: v, label: <span className="capitalize">{v}</span> }))} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={cn('h-7 w-7 rounded-full transition', color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-ink-900' : 'hover:scale-110')} style={{ background: c }} aria-label={c} />)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SUBJECT_ICONS).map(([k, I]) => (
                      <button key={k} onClick={() => setIcon(k)} className={cn('grid h-9 w-9 place-items-center rounded-xl border transition', icon === k ? '' : 'border-white/10 text-zinc-500 hover:text-white')} style={icon === k ? { borderColor: color, color, background: `${color}22` } : undefined}><I className="h-4 w-4" /></button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 text-center" style={{ boxShadow: `inset 0 0 80px ${color}15` }}>
                  <div className="label mb-4">Podgląd</div>
                  <motion.div key={icon + color} initial={{ scale: 0.7, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}><SubjectIcon icon={icon} color={color} size="lg" /></motion.div>
                  <div className="mt-4 line-clamp-2 font-display text-lg font-semibold text-white">{name || 'Twój przedmiot'}</div>
                  <div className="mt-1 text-xs capitalize text-zinc-500">{examType} · {fmt(examDate, 'd MMMM')}</div>
                  <div className="mt-5 font-display text-5xl font-bold" style={{ color }}>{Math.max(0, Math.round((new Date(examDate).getTime() - new Date(todayISO()).getTime()) / 864e5))}</div>
                  <div className="text-xs text-zinc-500">dni do terminu</div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Jaki materiał obejmuje?</h2>
                    <p className="mt-1 text-sm text-zinc-400">Wklej sylabus – AI wyciągnie tematy. Albo wpisz je ręcznie, po jednym w linii.</p>
                  </div>
                  <Segmented value={mode} onChange={setMode} options={[{ value: 'ai', label: <><Sparkles className="h-3.5 w-3.5" />Analiza AI</> }, { value: 'manual', label: <><ListPlus className="h-3.5 w-3.5" />Ręcznie</> }]} />
                </div>
                {mode === 'ai' ? <Analyzer onResult={setTopics} accent={color} compact={false} /> : (
                  <textarea value={manual} onChange={(e) => setManual(e.target.value)} rows={12} className="input font-mono" placeholder={'Granice funkcji\nPochodne\nCałki oznaczone\n…'} />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <h2 className="text-2xl font-semibold">Ile czasu możesz poświęcić?</h2>
                  <p className="mb-6 mt-1 text-sm text-zinc-400">Plan nigdy nie przekroczy zadeklarowanej dostępności.</p>
                  <AvailabilityBars value={settings.availability} onChange={(availability) => setSettings({ ...settings, availability })} />
                </div>
                <div className="space-y-6">
                  <div><span className="label mb-3 block">Kiedy uczysz się najlepiej?</span><PreferredTime value={settings.preferredTime} onChange={(preferredTime) => setSettings({ ...settings, preferredTime })} /></div>
                  <div><span className="label mb-3 block">Maks. długość sesji</span>
                    <Segmented value={String(settings.sessionLength)} onChange={(v) => setSettings({ ...settings, sessionLength: Number(v) })} className="w-full" options={['25', '50', '75', '90'].map((v) => ({ value: v, label: `${v} min` }))} />
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                    <div className="flex justify-between text-zinc-400"><span>Materiał do nauki</span><b className="text-white">{minutes(finalTopics.reduce((a, t) => a + t.estMinutes, 0))}</b></div>
                    <div className="mt-2 flex justify-between text-zinc-400"><span>Tematy</span><b className="text-white">{finalTopics.length}</b></div>
                    <div className="mt-2 flex justify-between text-zinc-400"><span>+ powtórki</span><b className="text-white">3 × 20 min / temat</b></div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="py-6">
                {error === 'paywall' ? (
                  <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-amber-300"><Crown className="h-8 w-8" /></div>
                    <h2 className="text-2xl font-semibold">Limit planu Free</h2>
                    <p className="mt-2 text-zinc-400">Masz już 3 przedmioty. Przejdź na Premium (99 zł/rok), aby dodać kolejne.</p>
                    <div className="mt-6 flex justify-center gap-2"><Button variant="secondary" onClick={() => go(2)}>Wróć</Button><Button onClick={() => nav('/app/settings#plan')} icon={<Crown className="h-4 w-4" />}>Premium</Button></div>
                  </div>
                ) : error ? (
                  <div className="text-center text-rose-300">{error} <Button variant="secondary" className="ml-2" onClick={() => go(2)}>Wróć</Button></div>
                ) : phase < 4 ? (
                  <div className="mx-auto flex max-w-md flex-col items-center text-center">
                    <div className="relative mb-8 grid h-36 w-36 place-items-center">
                      <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-violet-400/40" />
                      <div className="absolute inset-4 animate-spin-slow rounded-full border border-dashed border-cyan-400/40 [animation-direction:reverse]" />
                      <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-2xl" />
                      <Wand2 className="relative h-10 w-10 text-violet-200" />
                    </div>
                    <h2 className="text-2xl font-semibold">AI układa Twój plan…</h2>
                    <div className="mt-6 w-full space-y-3 text-left">
                      {['Zapisuję Twoją dostępność', 'Rozkładam tematy wg pilności i trudności', 'Wstawiam powtórki 1 · 3 · 7 dni', 'Sprawdzam wykonalność planu'].map((t, i) => (
                        <motion.div key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= phase ? 1 : 0.3, x: 0 }} className="flex items-center gap-3 text-sm">
                          {i < phase ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : i === phase ? <span className="grid h-5 w-5 place-items-center"><span className="h-2.5 w-2.5 animate-ping rounded-full bg-violet-400" /></span> : <span className="h-5 w-5 rounded-full border border-white/15" />}
                          <span className={i <= phase ? 'text-white' : 'text-zinc-600'}>{t}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : report && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-2xl text-center">
                    <div className={cn('mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl', deficit ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300 shadow-[0_0_60px_rgba(52,211,153,.35)]')}>
                      {deficit ? <AlertTriangle className="h-10 w-10" /> : <CalendarCheck2 className="h-10 w-10" />}
                    </div>
                    <h2 className="text-3xl font-semibold">{deficit ? 'Plan gotowy – ale czasu jest za mało' : 'Twój plan jest gotowy! 🎉'}</h2>
                    <p className="mt-2 text-zinc-400">{deficit ? `Brakuje ${minutes(deficit.deficitMinutes)}. Proponuję +${deficit.suggestions.extraPerDay} min dziennie albo ograniczenie zakresu – wybierzesz w widoku planu.` : 'Wszystkie tematy mieszczą się przed terminem, razem z powtórkami.'}</p>
                    <div className="mt-8 grid grid-cols-3 gap-3">
                      {[['Sesji', report.totalSessions, ''], ['Nauki', Math.round(report.learnMinutes / 6) / 10, ' h'], ['Powtórek', Math.round(report.reviewMinutes / 6) / 10, ' h']].map(([l, v, s]) => (
                        <div key={l as string} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <div className="font-display text-3xl font-bold text-white"><AnimatedNumber value={v as number} decimals={s ? 1 : 0} suffix={s as string} /></div>
                          <div className="text-xs text-zinc-500">{l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
                      <Button variant="secondary" onClick={() => nav('/app')}>Pulpit</Button>
                      <Button onClick={() => nav('/app/plan')} icon={<ArrowRight className="h-4 w-4" />}>Zobacz plan</Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 3 && (
          <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />}>Wstecz</Button>
            <span className="text-xs text-zinc-500">Krok {step + 1} z 4</span>
            <Button onClick={() => go(step + 1)} disabled={!canNext} icon={step === 2 ? <Sparkles className="h-4 w-4" /> : undefined}>
              {step === 2 ? 'Generuj plan' : 'Dalej'} {step < 2 && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
