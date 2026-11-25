import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Coffee, Maximize2, Pause, Play, RotateCcw, SkipForward, Timer, Volume2, VolumeX, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SubjectIcon } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader, Segmented } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';
import { celebrate, cn, todayISO } from '@/lib/utils';

type Mode = 'focus' | 'short' | 'long';
const MODES: Record<Mode, { l: string; c: [string, string]; icon: typeof Zap }> = {
  focus: { l: 'Skupienie', c: ['#a78bfa', '#22d3ee'], icon: Zap },
  short: { l: 'Krótka przerwa', c: ['#34d399', '#22d3ee'], icon: Coffee },
  long: { l: 'Długa przerwa', c: ['#f472b6', '#fbbf24'], icon: Coffee },
};

function chime() {
  try {
    const ac = new AudioContext();
    [660, 880, 1320].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      const t = ac.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 1);
    });
  } catch { /* brak audio */ }
}

function useBrownNoise() {
  const ctx = useRef<AudioContext | null>(null);
  const node = useRef<AudioBufferSourceNode | null>(null);
  const [on, setOn] = useState(false);
  const toggle = () => {
    if (on) { node.current?.stop(); node.current = null; setOn(false); return; }
    const ac = ctx.current ?? new AudioContext();
    ctx.current = ac;
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    const gain = ac.createGain(); gain.gain.value = 0.35;
    src.connect(gain).connect(ac.destination);
    src.start();
    node.current = src;
    setOn(true);
  };
  useEffect(() => () => node.current?.stop(), []);
  return { on, toggle };
}

export default function Focus() {
  const { subjects, handleReport } = useApp();
  const [params] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [focusLen, setFocusLen] = useState(25);
  const [mode, setMode] = useState<Mode>('focus');
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const total = useMemo(() => (mode === 'focus' ? focusLen : mode === 'short' ? 5 : 15) * 60, [mode, focusLen]);
  const [left, setLeft] = useState(total);
  const noise = useBrownNoise();
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    const id = params.get('session');
    if (!id) return;
    api.sessions(todayISO(), '9999-12-31').then((list) => {
      const s = list.find((x) => x.id === id);
      if (s) { setSession(s); setFocusLen(Math.min(90, Math.max(5, s.minutes))); }
    });
  }, [params]);

  useEffect(() => { if (!running) setLeft(total); }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    setRunning(false);
    endAt.current = null;
    if (mode === 'focus') {
      setRounds((r) => r + 1);
      celebrate(1.5);
      toast.success('Blok skupienia zakończony! 🎉', { description: 'Czas na przerwę – wstań, napij się wody.' });
      setMode((rounds + 1) % 4 === 0 ? 'long' : 'short');
    } else {
      toast('Przerwa skończona – wracamy do nauki 💪');
      setMode('focus');
    }
    chime();
  }, [mode, rounds]);

  useEffect(() => {
    if (!running) return;
    endAt.current ??= Date.now() + left * 1000;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { clearInterval(t); finish(); }
    }, 250);
    return () => clearInterval(t);
  }, [running, finish]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    document.title = running ? `${mm}:${ss} · ${MODES[mode].l} — SmartStudy` : 'SmartStudy — AI planer nauki';
    return () => { document.title = 'SmartStudy — AI planer nauki'; };
  }, [left, running, mode]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const toggle = () => {
    if (running) { setRunning(false); endAt.current = null; } else setRunning(true);
  };
  const reset = () => { setRunning(false); endAt.current = null; setLeft(total); };
  const switchMode = (m: Mode) => { setRunning(false); endAt.current = null; setMode(m); };

  const markDone = async () => {
    if (!session) return;
    const r = await api.updateSession(session.id, 'done');
    setSession(r.session);
    handleReport(null, { silent: true });
    celebrate(2);
    toast.success('Sesja oznaczona jako zrobiona ✅');
  };

  const pct = 1 - left / total;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const M = MODES[mode];
  const subject = session ? subjects.find((s) => s.id === session.subjectId) : null;
  const R = 150;
  const C = 2 * Math.PI * R;

  return (
    <div>
      <PageHeader eyebrow={<><Timer className="h-3.5 w-3.5" />Tryb skupienia</>} title="Skupienie" subtitle="Technika Pomodoro: blok pracy, krótka przerwa, co czwarty blok dłuższa przerwa."
        actions={<Button variant="ghost" size="sm" onClick={() => document.documentElement.requestFullscreen?.()} icon={<Maximize2 className="h-3.5 w-3.5" />}>Pełny ekran</Button>} />

      <Card className="relative overflow-hidden px-4 py-10 sm:px-10" spotlight={false}>
        <motion.div className="pointer-events-none absolute inset-0 m-auto h-[520px] w-[520px] rounded-full blur-[110px]"
          animate={{ background: `radial-gradient(circle, ${M.c[0]}55, ${M.c[1]}22, transparent 70%)`, scale: running ? [1, 1.12, 1] : 1 }}
          transition={{ scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, background: { duration: 0.8 } }} />

        <div className="relative flex flex-col items-center">
          <Segmented value={mode} onChange={switchMode} layoutId="focus-mode" options={(Object.keys(MODES) as Mode[]).map((m) => ({ value: m, label: MODES[m].l }))} />

          <AnimatePresence>
            {session && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                {subject && <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />}
                <div className="text-left">
                  <div className="text-sm font-medium text-white">{session.title}</div>
                  <div className="text-[11px] text-zinc-500">{subject?.name} · {session.minutes} min</div>
                </div>
                {session.status === 'done' ? <CheckCircle2 className="ml-2 h-5 w-5 text-emerald-400" /> : <Button size="sm" variant="success" className="ml-2" onClick={markDone}>Zrobione</Button>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative my-10 grid place-items-center">
            <svg width={R * 2 + 40} height={R * 2 + 40} className="-rotate-90 max-w-[86vw]" viewBox={`0 0 ${R * 2 + 40} ${R * 2 + 40}`}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={M.c[0]} /><stop offset="1" stopColor={M.c[1]} /></linearGradient>
              </defs>
              {Array.from({ length: 60 }).map((_, i) => {
                const a = (i / 60) * Math.PI * 2;
                const r1 = R + 14; const r2 = R + (i % 5 === 0 ? 22 : 18);
                return <line key={i} x1={R + 20 + Math.cos(a) * r1} y1={R + 20 + Math.sin(a) * r1} x2={R + 20 + Math.cos(a) * r2} y2={R + 20 + Math.sin(a) * r2} stroke={i / 60 <= pct ? M.c[0] : 'rgba(255,255,255,.12)'} strokeWidth={i % 5 === 0 ? 2 : 1} />;
              })}
              <circle cx={R + 20} cy={R + 20} r={R} stroke="rgba(255,255,255,.06)" strokeWidth="10" fill="none" />
              <motion.circle cx={R + 20} cy={R + 20} r={R} stroke="url(#fg)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={C}
                animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.3, ease: 'linear' }} style={{ filter: `drop-shadow(0 0 14px ${M.c[0]})` }} />
            </svg>
            <div className="absolute flex flex-col items-center">
              <div className="label mb-2 flex items-center gap-1.5"><M.icon className="h-3.5 w-3.5" />{M.l}</div>
              <div className="font-mono text-7xl font-bold tabular-nums tracking-tight text-white sm:text-8xl" style={{ textShadow: `0 0 40px ${M.c[0]}88` }}>{mm}:{ss}</div>
              <div className="mt-3 flex gap-1.5">
                {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-2 w-2 rounded-full transition', i < rounds % 4 || (rounds && rounds % 4 === 0) ? 'bg-violet-400 shadow-[0_0_8px_#a78bfa]' : 'bg-white/15')} />)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-2xl" onClick={reset} aria-label="Reset"><RotateCcw className="h-5 w-5" /></Button>
            <motion.button whileTap={{ scale: 0.94 }} onClick={toggle} className="grid h-20 w-20 place-items-center rounded-[28px] text-white shadow-2xl" style={{ background: `linear-gradient(135deg, ${M.c[0]}, ${M.c[1]})`, boxShadow: `0 20px 60px -15px ${M.c[0]}` }} aria-label={running ? 'Pauza' : 'Start'}>
              {running ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
            </motion.button>
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-2xl" onClick={() => { setLeft(0); endAt.current = Date.now(); if (!running) finish(); }} aria-label="Pomiń"><SkipForward className="h-5 w-5" /></Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-zinc-500">Blok:</span>
            <Segmented value={String(focusLen)} onChange={(v) => { setFocusLen(Number(v)); }} options={['15', '25', '50', String(focusLen)].filter((v, i, a) => a.indexOf(v) === i).map((v) => ({ value: v, label: `${v} min` }))} />
            <button onClick={noise.toggle} className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-2 transition', noise.on ? 'border-violet-400/40 bg-violet-500/15 text-violet-100' : 'border-white/10 text-zinc-400 hover:text-white')}>
              {noise.on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}Szum skupienia
            </button>
          </div>
          <p className="mt-6 text-[11px] text-zinc-600">Spacja – start/pauza · ukończone bloki dziś: {rounds}</p>
        </div>
      </Card>
    </div>
  );
}
