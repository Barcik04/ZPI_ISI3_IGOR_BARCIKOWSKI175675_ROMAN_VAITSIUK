import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CalendarClock, Lightbulb, PartyPopper, RotateCw, Sparkles, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Markdown, SubjectIcon } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Kbd, PageHeader, ProgressBar, Skeleton } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { ReviewItem } from '@/lib/types';
import { celebrate, cn } from '@/lib/utils';

const GRADES = [
  { g: 0, l: 'Nie pamiętam', d: 'wróć do materiału', c: '#f43f5e', k: '1' },
  { g: 1, l: 'Trudne', d: 'z pomocą notatek', c: '#f59e0b', k: '2' },
  { g: 2, l: 'Dobrze', d: 'większość pamiętam', c: '#22d3ee', k: '3' },
  { g: 3, l: 'Łatwe', d: 'pamiętam wszystko', c: '#34d399', k: '4' },
];

const PROMPTS = [
  'Wyjaśnij ten temat własnymi słowami, jakbyś tłumaczył go koledze.',
  'Wypisz z pamięci 3 najważniejsze pojęcia i jedną definicję.',
  'Podaj przykład zastosowania lub zadanie, które potrafisz rozwiązać.',
  'Narysuj (w głowie lub na kartce) schemat łączący kluczowe elementy.',
];

export default function Reviews() {
  const { handleReport } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [upcoming, setUpcoming] = useState(0);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.reviewsDue().then((r) => { setItems(r.due); setUpcoming(r.upcoming); }).catch((e) => toast.error(e.message));
  }, []);

  const current = items?.[idx];
  const done = items && idx >= items.length && items.length > 0;

  const grade = useCallback(async (g: number) => {
    if (!current || busy || !flipped) return;
    setBusy(true);
    try {
      await api.updateSession(current.session.id, 'done', g);
      setResults((r) => [...r, g]);
      setFlipped(false);
      setTimeout(() => setIdx((i) => i + 1), 120);
      if (items && idx + 1 >= items.length) { celebrate(2); handleReport(null, { silent: true }); }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [current, busy, flipped, items, idx, handleReport]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); setFlipped((f) => !f); }
      const n = Number(e.key);
      if (n >= 1 && n <= 4) grade(n - 1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [grade]);

  return (
    <div>
      <PageHeader eyebrow={<><Brain className="h-3.5 w-3.5" />Moduł 4 · Spaced repetition</>} title="Powtórki" subtitle="Aktywne przypominanie + samoocena. Twoja ocena zmienia poziom opanowania tematu i wpływa na kolejne powtórki." />

      {!items ? <Skeleton className="mx-auto h-[420px] max-w-2xl" /> : !items.length ? (
        <Card className="mx-auto max-w-2xl">
          <EmptyState icon={<PartyPopper className="h-7 w-7" />} title="Wszystkie powtórki zrobione!" text={upcoming ? `W ciągu najbliższych dni czeka ${upcoming} kolejnych – plan wstawi je w odpowiednim momencie.` : 'Gdy opanujesz nowe tematy, pojawią się tu powtórki po 1, 3 i 7 dniach.'}
            action={<Button variant="secondary" onClick={() => nav('/app/plan')} icon={<CalendarClock className="h-4 w-4" />}>Zobacz plan</Button>} />
        </Card>
      ) : done ? (
        <Summary results={results} onBack={() => nav('/app')} />
      ) : current && (
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center gap-4">
            <ProgressBar value={(idx / items.length) * 100} color="#a78bfa" height={6} />
            <span className="shrink-0 font-mono text-xs text-zinc-400">{idx + 1} / {items.length}</span>
          </div>

          <div className="relative h-[400px] [perspective:1600px]">
            {items.slice(idx + 1, idx + 3).map((it, i) => (
              <div key={it.session.id} className="absolute inset-0 rounded-[28px] border border-white/[0.06] bg-ink-850/70" style={{ transform: `translateY(${(i + 1) * 12}px) scale(${1 - (i + 1) * 0.04})`, zIndex: -i - 1, opacity: 0.6 - i * 0.25 }} />
            ))}
            <AnimatePresence mode="popLayout">
              <motion.div key={current.session.id} initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 200, rotate: 12, transition: { duration: 0.35 } }}
                className="absolute inset-0">
                <motion.div className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} onClick={() => setFlipped(!flipped)}>
                  {/* przód */}
                  <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 p-8 [backface-visibility:hidden]"
                    style={{ boxShadow: `0 40px 100px -40px ${current.subject.color}99` }}>
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: current.subject.color }} />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2.5"><SubjectIcon icon={current.subject.icon} color={current.subject.color} size="sm" /><span className="text-sm text-zinc-400">{current.subject.name}</span></div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-zinc-300">Powtórka {(current.session.reviewIndex ?? 0) + 1}/3</span>
                    </div>
                    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
                      <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">{current.topic?.title}</h2>
                      <p className="mt-5 max-w-md text-sm text-zinc-400">{PROMPTS[idx % PROMPTS.length]}</p>
                    </div>
                    <div className="relative flex items-center justify-center gap-2 text-xs text-zinc-500"><RotateCw className="h-3.5 w-3.5" />Kliknij lub <Kbd>Spacja</Kbd>, by odwrócić</div>
                  </div>
                  {/* tył */}
                  <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-ink-900 to-ink-800 p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white"><Lightbulb className="h-4 w-4 text-amber-300" />Sprawdź się</div>
                    <div className="mt-4 flex-1 overflow-y-auto">
                      {current.hint ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <div className="label mb-2">Z Twoich notatek</div>
                          <Markdown text={current.hint} />
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">Brak notatek do tego przedmiotu. Porównaj swoją odpowiedź z wykładem lub podręcznikiem, a potem uczciwie oceń, ile pamiętasz.</p>
                      )}
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-white/[0.03] p-2"><div className="text-zinc-500">Trudność</div><div className="font-semibold text-white">{current.topic?.difficulty}/5</div></div>
                        <div className="rounded-xl bg-white/[0.03] p-2"><div className="text-zinc-500">Opanowanie</div><div className="font-semibold text-white">{current.topic?.mastery}%</div></div>
                        <div className="rounded-xl bg-white/[0.03] p-2"><div className="text-zinc-500">Czas</div><div className="font-semibold text-white">{current.session.minutes} min</div></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div animate={{ opacity: flipped ? 1 : 0.35 }} className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button key={g.g} disabled={!flipped || busy} onClick={() => grade(g.g)}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed"
                style={{ ['--c' as string]: g.c }}
                onMouseEnter={(e) => flipped && (e.currentTarget.style.borderColor = `${g.c}66`)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}>
                <div className="flex items-center justify-between"><span className="text-sm font-semibold" style={{ color: g.c }}>{g.l}</span><Kbd>{g.k}</Kbd></div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{g.d}</div>
              </button>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Summary({ results, onBack }: { results: number[]; onBack: () => void }) {
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const score = Math.round((avg / 3) * 100);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl">
      <Card className="relative overflow-hidden p-10 text-center">
        <div className="absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-amber-400/30 blur-3xl" />
        <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_20px_60px_-10px_rgba(251,191,36,.6)]">
          <Trophy className="h-10 w-10" />
        </motion.div>
        <h2 className="relative text-3xl font-semibold">Sesja powtórek zaliczona!</h2>
        <p className="relative mt-2 text-zinc-400">Powtórzone tematy: <b className="text-white">{results.length}</b> · średnia pewność <b className="text-white">{score}%</b></p>
        <div className="relative mt-6 flex justify-center gap-2">
          {GRADES.map((g) => (
            <div key={g.g} className={cn('rounded-xl border px-3 py-2 text-xs')} style={{ borderColor: `${g.c}40`, color: g.c, background: `${g.c}10` }}>
              {g.l}: <b>{results.filter((r) => r === g.g).length}</b>
            </div>
          ))}
        </div>
        <Button className="relative mt-8" onClick={onBack} icon={<Sparkles className="h-4 w-4" />}>Wróć na pulpit</Button>
      </Card>
    </motion.div>
  );
}
