import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Bot, Brain, CalendarClock, Check, ChevronRight, Clock3, Crown, FileText, Flame, GraduationCap,
  PenTool, Play, RefreshCw, ScanText, Sparkles, Target, TrendingUp, Wand2, Zap,
} from 'lucide-react';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Aurora, Logo } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.21, 0.6, 0.35, 1] } }),
};

function useDemoLogin() {
  const { login, user } = useApp();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  return {
    loading,
    go: async () => {
      if (user) return nav('/app');
      setLoading(true);
      try {
        await login('demo@smartstudy.pl', 'demo123');
        nav('/app');
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
  };
}

export default function Landing() {
  const { user } = useApp();
  const demo = useDemoLogin();
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <Aurora />
      <div className="noise" />
      <TopNav loggedIn={!!user} />
      <Hero onDemo={demo.go} demoLoading={demo.loading} />
      <Marquee />
      <Problems />
      <Bento />
      <HowItWorks />
      <Retention />
      <Pricing />
      <Roadmap />
      <FinalCta onDemo={demo.go} demoLoading={demo.loading} />
      <Footer />
    </div>
  );
}

function TopNav({ loggedIn }: { loggedIn: boolean }) {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ['rgba(5,5,10,0)', 'rgba(5,5,10,0.7)']);
  const border = useTransform(scrollY, [0, 80], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)']);
  return (
    <motion.header style={{ backgroundColor: bg, borderColor: border }} className="fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-1 text-sm text-zinc-400 md:flex">
          {[['#funkcje', 'Funkcje'], ['#jak', 'Jak to działa'], ['#cennik', 'Cennik'], ['#trl', 'Roadmapa']].map(([h, l]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link to="/app"><Button size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>Otwórz aplikację</Button></Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block"><Button variant="ghost" size="sm">Zaloguj</Button></Link>
              <Link to="/register"><Button size="sm">Zacznij za darmo</Button></Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

function Hero({ onDemo, demoLoading }: { onDemo: () => void; demoLoading: boolean }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -2]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 20 });
  const onMove = (e: MouseEvent) => {
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  };
  return (
    <section onMouseMove={onMove} className="relative px-5 pb-10 pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl text-center">
        <motion.a href="#funkcje" variants={fadeUp} initial="hidden" animate="show" className="group mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-zinc-300 backdrop-blur transition hover:border-violet-400/40">
          <span className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Nowość</span>
          Planer, który sam myśli
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </motion.a>
        <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1} className="text-balance text-5xl font-bold leading-[1.02] sm:text-7xl lg:text-[88px]">
          Ucz się mądrzej.
          <br />
          <span className="text-gradient-animated">AI zaplanuje resztę.</span>
        </motion.h1>
        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mx-auto mt-7 max-w-2xl text-balance text-base text-zinc-400 sm:text-lg">
          Podaj terminy egzaminów i wklej sylabus. SmartStudy rozpozna tematy, oszacuje ich trudność, ułoży spersonalizowany plan z powtórkami
          i <span className="text-zinc-200">sam go przeliczy</span>, gdy coś pójdzie nie tak.
        </motion.p>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register"><Button size="lg" icon={<Sparkles className="h-4 w-4" />}>Stwórz plan za darmo</Button></Link>
          <Button size="lg" variant="secondary" onClick={onDemo} loading={demoLoading} icon={<Play className="h-4 w-4 fill-current" />}>Wejdź na konto demo</Button>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
          {['Pierwszy plan w < 2 min', 'Powtórki 1 · 3 · 7 dni', 'Uczciwe ostrzeżenia o braku czasu'].map((t) => (
            <span key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />{t}</span>
          ))}
        </motion.div>
      </div>

      <div className="relative mx-auto mt-20 max-w-6xl [perspective:1800px]">
        <div className="absolute inset-x-10 -top-10 h-40 rounded-full bg-violet-600/30 blur-[100px]" />
        <motion.div style={{ rotateX: rx, rotateY: ry }} initial={{ opacity: 0, y: 80, rotateX: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="relative [transform-style:preserve-3d]">
          <HeroMock />
          <FloatCard className="-left-4 top-16 hidden md:block lg:-left-14" z={80} delay={0}>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><AlertTriangle className="h-4 w-4" /></div>
              <div>
                <div className="text-xs font-semibold text-white">Wykryto deficyt 2 h</div>
                <div className="text-[11px] text-zinc-400">Proponuję +40 min/dzień</div>
              </div>
            </div>
          </FloatCard>
          <FloatCard className="-right-4 top-40 hidden md:block lg:-right-12" z={120} delay={1.5}>
            <div className="flex items-center gap-3">
              <ProgressRing value={78} size={46} stroke={5}><span className="text-[10px] font-bold text-white">78%</span></ProgressRing>
              <div>
                <div className="text-xs font-semibold text-white">Bazy danych</div>
                <div className="text-[11px] text-zinc-400">egzamin za 11 dni</div>
              </div>
            </div>
          </FloatCard>
          <FloatCard className="-bottom-6 left-1/4 hidden md:block" z={100} delay={0.8}>
            <div className="flex items-center gap-2 text-xs"><Flame className="h-4 w-4 text-orange-400" /><span className="font-semibold text-white">12 dni</span><span className="text-zinc-400">serii nauki</span></div>
          </FloatCard>
        </motion.div>
      </div>
    </section>
  );
}

function FloatCard({ children, className, z, delay }: { children: ReactNode; className?: string; z: number; delay: number }) {
  return (
    <div className={cn('absolute', className)} style={{ transform: `translateZ(${z}px)` }}>
      <div className="glass-strong animate-float rounded-2xl px-4 py-3 shadow-2xl" style={{ animationDelay: `${delay}s` }}>{children}</div>
    </div>
  );
}

function HeroMock() {
  const sessions = [
    { t: '18:00', title: 'Powtórka 2/3 · Normalizacja', c: '#22d3ee', m: 20, done: true },
    { t: '18:30', title: 'Ekstrema warunkowe – Lagrange', c: '#8b5cf6', m: 50, done: true },
    { t: '19:30', title: 'Całki podwójne (cz. 1/2)', c: '#8b5cf6', m: 50, done: false, now: true },
    { t: '20:30', title: 'Analiza SWOT', c: '#f472b6', m: 30, done: false },
  ];
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-ink-900/80 shadow-[0_50px_120px_-30px_rgba(0,0,0,.9)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-400/80" /><span className="h-3 w-3 rounded-full bg-amber-300/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <div className="mx-auto rounded-md bg-white/[0.04] px-3 py-1 font-mono text-[10px] text-zinc-500">smartstudy.app/plan</div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="label">Dziś · środa</div>
              <div className="mt-1 font-display text-2xl font-semibold text-white">Plan na dziś</div>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">Plan wykonalny</div>
          </div>
          {sessions.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.12 }}
              className={cn('flex items-center gap-3 rounded-2xl border p-3', s.now ? 'border-violet-400/30 bg-violet-500/10' : 'border-white/[0.06] bg-white/[0.02]')}>
              <div className="h-10 w-1 rounded-full" style={{ background: s.c, boxShadow: `0 0 12px ${s.c}` }} />
              <div className="w-11 font-mono text-xs text-zinc-500">{s.t}</div>
              <div className={cn('flex-1 truncate text-sm', s.done ? 'text-zinc-500 line-through' : 'text-zinc-100')}>{s.title}</div>
              <div className="text-[11px] text-zinc-500">{s.m} min</div>
              <div className={cn('grid h-6 w-6 place-items-center rounded-full border', s.done ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-300' : 'border-white/15')}>
                {s.done && <Check className="h-3.5 w-3.5" />}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <ProgressRing value={64} size={92} stroke={9}>
              <div className="text-center"><div className="font-display text-xl font-bold text-white">64%</div><div className="text-[9px] text-zinc-500">dzisiaj</div></div>
            </ProgressRing>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-400"><Clock3 className="h-3.5 w-3.5 text-cyan-300" /> 1 h 10 min / 2 h 30 min</div>
              <div className="flex items-center gap-2 text-zinc-400"><Brain className="h-3.5 w-3.5 text-violet-300" /> 3 powtórki dziś</div>
              <div className="flex items-center gap-2 text-zinc-400"><TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> +18% vs. tydzień</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="label mb-3">Obciążenie – 14 dni</div>
            <div className="flex h-20 items-end gap-1.5">
              {[40, 65, 55, 80, 70, 95, 50, 60, 85, 75, 45, 90, 70, 55].map((h, i) => (
                <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1.2 + i * 0.04, duration: 0.6 }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600/60 to-cyan-400/80" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Marquee() {
  const items = ['Analiza matematyczna', 'Bazy danych', 'Sieci komputerowe', 'Fizyka', 'Matura z matematyki', 'Algorytmy', 'Prawo cywilne', 'Anatomia', 'Mikroekonomia', 'Certyfikat AWS', 'Język niemiecki B2', 'Programowanie obiektowe'];
  return (
    <section className="relative py-14">
      <p className="label mb-6 text-center">Dla każdego przedmiotu – od sesji po maturę i certyfikaty</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        <div className="flex w-max animate-marquee gap-3">
          {[...items, ...items].map((t, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-zinc-400">
              <GraduationCap className="h-3.5 w-3.5 text-violet-300" />{t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text?: string }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mx-auto mb-14 max-w-3xl text-center">
      <div className="label mb-4 text-violet-300">{eyebrow}</div>
      <h2 className="text-balance text-4xl font-bold sm:text-5xl">{title}</h2>
      {text && <p className="mx-auto mt-5 max-w-2xl text-balance text-zinc-400">{text}</p>}
    </motion.div>
  );
}

function Problems() {
  const items = [
    { icon: Clock3, t: 'Nauka na ostatnią chwilę', d: 'Studenci uczą się chaotycznie i zaczynają za późno.' },
    { icon: Target, t: 'Nie wiadomo, ile to zajmie', d: 'Trudno ocenić, ile czasu wymaga opanowanie przedmiotu.' },
    { icon: CalendarClock, t: 'Statyczne kalendarze', d: 'Klasyczne planery nie dopasowują się do tempa i stylu nauki.' },
    { icon: RefreshCw, t: 'Planowanie zamiast nauki', d: 'Godziny tracone na rozpisywanie i poprawianie planu.' },
  ];
  return (
    <section className="px-5 py-24">
      <SectionTitle eyebrow="Problem" title={<>Znasz to? <span className="text-zinc-500">My też.</span></>} />
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div key={it.t} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="glass group rounded-3xl p-6 transition hover:-translate-y-1 hover:border-rose-400/20">
            <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-300 transition group-hover:scale-110"><it.icon className="h-5 w-5" /></div>
            <h3 className="font-semibold">{it.t}</h3>
            <p className="mt-2 text-sm text-zinc-400">{it.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function BentoCard({ className, children, i = 0 }: { className?: string; children: ReactNode; i?: number }) {
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <motion.div onMouseMove={move} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} custom={i}
      className={cn('glass spotlight relative overflow-hidden rounded-[28px] p-7', className)}>
      {children}
    </motion.div>
  );
}

function Bento() {
  return (
    <section id="funkcje" className="scroll-mt-20 px-5 py-24">
      <SectionTitle eyebrow="5 modułów · 1 inteligentny system" title={<>Wszystko, czego potrzebujesz, <span className="text-gradient">żeby zdać.</span></>}
        text="Każdy moduł SmartStudy został zaprojektowany i zweryfikowany osobno (TRL III–IV), a potem połączony w jeden spójny łańcuch." />
      <div className="mx-auto grid max-w-6xl auto-rows-[minmax(260px,auto)] gap-4 md:grid-cols-6">
        <BentoCard className="md:col-span-4" i={0}>
          <Feature icon={<Wand2 />} tag="Moduł 1" title="Plan generowany przez AI" text="Termin, trudność, objętość materiału i Twój dostępny czas → harmonogram, który mieści się w dobie. Przedmioty są przeplatane wg pilności." />
          <div className="mt-6 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 21 }).map((_, i) => {
              const c = ['#8b5cf6', '#22d3ee', '#f472b6', '#f59e0b'][(i * 7 + (i % 3)) % 4];
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                  className="flex h-12 flex-col justify-end gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                  {Array.from({ length: 1 + (i % 3) }).map((__, k) => <div key={k} className="h-1.5 rounded-full" style={{ background: k ? ['#8b5cf6', '#22d3ee', '#f472b6', '#f59e0b'][(i + k) % 4] : c, opacity: 0.85 }} />)}
                </motion.div>
              );
            })}
          </div>
        </BentoCard>
        <BentoCard className="md:col-span-2" i={1}>
          <Feature icon={<ScanText />} tag="Moduł 2" title="Analiza sylabusa" text="Wklej sylabus lub notatki – AI wyciągnie listę tematów i oszacuje trudność." />
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-950/60 p-4">
            <div className="absolute inset-x-0 h-8 animate-scan bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent" />
            {['W1. Granice funkcji', 'W2. Pochodne cząstkowe', 'W3. Całki podwójne', 'W4. Szeregi'].map((t, i) => (
              <div key={t} className="flex items-center justify-between py-1 text-xs">
                <span className="text-zinc-300"><FileText className="mr-1.5 inline h-3 w-3 text-cyan-300" />{t}</span>
                <span className="font-mono text-[10px] text-cyan-300">{[92, 96, 89, 94][i]}%</span>
              </div>
            ))}
          </div>
        </BentoCard>
        <BentoCard className="md:col-span-2" i={2}>
          <Feature icon={<RefreshCw />} tag="Moduł 3" title="Auto-korekta planu" text="Opuściłeś sesję? Plan przelicza się sam. A gdy czasu brakuje – mówimy to wprost." />
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-amber-200"><AlertTriangle className="h-4 w-4" />6 h pracy, 4 h czasu</div>
            <div className="mt-2 text-amber-100/70">Deficyt: 2 h. Opcje: zmiana priorytetów · ograniczenie zakresu · +40 min/dzień</div>
          </div>
        </BentoCard>
        <BentoCard className="md:col-span-2" i={3}>
          <Feature icon={<Brain />} tag="Moduł 4" title="Powtórki 1 · 3 · 7" text="Spaced repetition wpięte w harmonogram. Nigdy po egzaminie." />
          <div className="relative mt-8 flex items-center justify-between px-2">
            <div className="absolute inset-x-2 top-1/2 h-px bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-400" />
            {['D0', 'D1', 'D3', 'D7', 'EGZ'].map((d, i) => (
              <motion.div key={d} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.15, type: 'spring' }}
                className={cn('relative grid h-10 w-10 place-items-center rounded-full border text-[10px] font-bold', i === 4 ? 'border-pink-400/50 bg-pink-500/20 text-pink-200' : 'border-violet-400/40 bg-ink-900 text-violet-200')}>
                {d}
              </motion.div>
            ))}
          </div>
        </BentoCard>
        <BentoCard className="md:col-span-2" i={4}>
          <Feature icon={<PenTool />} tag="Moduł 5" title="Notatki z rysikiem" text="Pisz na tablecie bezpośrednio w aplikacji. AI widzi Twoje notatki na bieżąco." />
          <svg viewBox="0 0 240 70" className="mt-5 h-20 w-full">
            <motion.path d="M10 50 C 30 10, 50 10, 60 40 S 90 70, 100 35 S 130 5, 140 40 S 170 60, 180 30 S 210 15, 230 35" fill="none" stroke="url(#pen)" strokeWidth="3" strokeLinecap="round"
              pathLength={1} strokeDasharray="1" initial={{ strokeDashoffset: 1 }} whileInView={{ strokeDashoffset: 0 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
            <defs><linearGradient id="pen" x1="0" x2="1"><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
          </svg>
        </BentoCard>
        <BentoCard className="md:col-span-6" i={5}>
          <div className="grid items-center gap-8 md:grid-cols-2">
            <Feature icon={<Bot />} tag="Asystent" title="Porozmawiaj ze swoim planem" text="„Co mam dziś?”, „Ile dni do egzaminu?”, „Nie zdążyłem – przelicz”. Asystent zna Twój harmonogram, postępy i notatki." />
            <div className="space-y-2.5">
              <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm text-white">Nie zdążyłem wczoraj, co teraz? 😩</div>
              <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200">
                Spokojnie – przeliczyłem plan ⚙️ 2 zaległe sesje rozłożyłem na czwartek i piątek. Plan nadal jest <b className="text-emerald-300">wykonalny</b>.
              </div>
            </div>
          </div>
        </BentoCard>
      </div>
    </section>
  );
}

function Feature({ icon, tag, title, text }: { icon: ReactNode; tag: string; title: string; text: string }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 text-violet-200 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{tag}</span>
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: CalendarClock, t: 'Dodaj egzaminy', d: 'Przedmiot, data i typ zaliczenia.' },
    { icon: ScanText, t: 'Wklej materiał', d: 'Sylabus lub notatki – AI rozpozna tematy.' },
    { icon: Clock3, t: 'Ustaw dostępność', d: 'Ile minut dziennie i o jakiej porze.' },
    { icon: Zap, t: 'Gotowe!', d: 'Plan z powtórkami w kilka sekund.' },
  ];
  return (
    <section id="jak" className="scroll-mt-20 px-5 py-24">
      <SectionTitle eyebrow="Jak to działa" title={<>Od chaosu do planu <span className="text-gradient">w 4 krokach</span></>} />
      <div className="relative mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent md:block" />
        {steps.map((s, i) => (
          <motion.div key={s.t} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="relative text-center">
            <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-ink-900 text-violet-200 shadow-glow">
              <s.icon className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 font-mono text-[11px] font-bold text-white">{i + 1}</span>
            </div>
            <h3 className="font-semibold">{s.t}</h3>
            <p className="mt-1 text-sm text-zinc-400">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Retention() {
  const ref = useRef<SVGSVGElement>(null);
  const W = 600;
  const H = 240;
  const pts = (fn: (t: number) => number) => Array.from({ length: 61 }, (_, i) => { const t = (i / 60) * 21; return `${(t / 21) * W},${H - fn(t) * (H - 20)}`; }).join(' L ');
  const without = (t: number) => Math.exp(-t / 2.2);
  const withR = (t: number) => {
    let S = 2.2; let last = 0;
    for (const r of [1, 3, 7]) if (t >= r) { S *= 2.1; last = r; }
    return Math.exp(-(t - last) / S);
  };
  return (
    <section className="px-5 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="label mb-4 text-cyan-300">Nauka oparta na modelu pamięci</div>
          <h2 className="text-4xl font-bold sm:text-5xl">Pokonaj <span className="text-gradient">krzywą zapominania</span></h2>
          <p className="mt-5 text-zinc-400">Bez powtórek większość materiału ulatuje w kilka dni. SmartStudy wstawia powtórki dokładnie wtedy, gdy pamięć zaczyna słabnąć – po 1, 3 i 7 dniach – i dopasowuje je do terminu egzaminu.</p>
          <div className="mt-8 flex gap-6 text-sm">
            <div className="flex items-center gap-2"><span className="h-2.5 w-6 rounded-full bg-zinc-600" />Bez powtórek</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />Z SmartStudy</div>
          </div>
          <p className="mt-4 text-xs text-zinc-600">* Wykres ilustracyjny (model Ebbinghausa). Hipoteza o +30% zapamiętywania wymaga weryfikacji w badaniach z użytkownikami.</p>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="glass rounded-[28px] p-6">
          <svg ref={ref} viewBox={`0 0 ${W} ${H + 24}`} className="w-full overflow-visible">
            <defs>
              <linearGradient id="rl" x1="0" x2="1"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
              <linearGradient id="rf" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8b5cf6" stopOpacity=".35" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={W} y1={H - y * (H - 20)} y2={H - y * (H - 20)} stroke="rgba(255,255,255,.05)" />)}
            {[1, 3, 7].map((d) => (
              <g key={d}>
                <line x1={(d / 21) * W} x2={(d / 21) * W} y1="10" y2={H} stroke="rgba(167,139,250,.25)" strokeDasharray="4 4" />
                <text x={(d / 21) * W} y={H + 18} textAnchor="middle" className="fill-violet-300 text-[11px]">dzień {d}</text>
              </g>
            ))}
            <motion.path d={`M ${pts(without)}`} fill="none" stroke="#52525b" strokeWidth="2.5" pathLength={1} strokeDasharray="1" initial={{ strokeDashoffset: 1 }} whileInView={{ strokeDashoffset: 0 }} viewport={{ once: true }} transition={{ duration: 1.5 }} />
            <motion.path d={`M 0,${H} L ${pts(withR)} L ${W},${H} Z`} fill="url(#rf)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2, duration: 1 }} />
            <motion.path d={`M ${pts(withR)}`} fill="none" stroke="url(#rl)" strokeWidth="3.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" initial={{ strokeDashoffset: 1 }} whileInView={{ strokeDashoffset: 0 }} viewport={{ once: true }} transition={{ duration: 2.2, delay: 0.3 }} style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,.6))' }} />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: 'Free', price: '0 zł', per: 'na zawsze', desc: 'Na start i pierwszą sesję.', features: ['Do 3 przedmiotów', 'Plan nauki z powtórkami', 'Auto-korekta harmonogramu', 'Notatki tekstowe', 'Asystent AI (tryb podstawowy)'], cta: 'Zacznij za darmo', to: '/register' },
    { name: 'Premium', price: '99 zł', per: 'rocznie · ok. 8 zł / mies.', desc: 'Dla tych, którzy chcą zdać wszystko.', features: ['Nielimitowane przedmioty', 'Analiza sylabusów i notatek przez AI', 'Komunikaty o deficycie czasu', 'Notatki odręczne (tablet + rysik)', 'Fiszki, quizy i statystyki', 'Integracja z kalendarzem'], cta: 'Wybierz Premium', to: '/register', featured: true },
    { name: 'Uczelnie', price: '25 zł', per: 'za studenta / rok', desc: 'Licencja dla wydziałów i szkół.', features: ['Plany grupowe', 'Raporty postępów', 'Integracja z Moodle', 'Wdrożenie i szkolenie', 'Bezpłatny pilotaż'], cta: 'Porozmawiajmy', to: '/register' },
  ];
  return (
    <section id="cennik" className="scroll-mt-20 px-5 py-24">
      <SectionTitle eyebrow="Cennik" title={<>Prosty model. <span className="text-gradient">Freemium.</span></>} text="Indywidualnie – za darmo lub Premium. Dla instytucji – roczna licencja zależna od liczby użytkowników." />
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
        {plans.map((p, i) => (
          <motion.div key={p.name} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
            className={cn('relative rounded-[28px] p-px', p.featured ? 'bg-gradient-to-b from-violet-400 via-fuchsia-500/50 to-cyan-400/40 lg:-translate-y-4' : 'bg-white/[0.07]')}>
            {p.featured && <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-glow">Najpopularniejszy</div>}
            <div className={cn('relative h-full rounded-[27px] p-7', p.featured ? 'bg-ink-900' : 'bg-ink-900/80 backdrop-blur')}>
              {p.featured && <div className="absolute -top-10 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-violet-600/30 blur-3xl" />}
              <div className="relative">
                <div className="flex items-center gap-2 font-display text-lg font-semibold text-white">{p.featured && <Crown className="h-4 w-4 text-amber-300" />}{p.name}</div>
                <p className="mt-1 text-sm text-zinc-500">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-2"><span className="font-display text-5xl font-bold text-white">{p.price}</span></div>
                <div className="mt-1 text-xs text-zinc-500">{p.per}</div>
                <Link to={p.to}><Button className="mt-7 w-full" variant={p.featured ? 'primary' : 'secondary'}>{p.cta}</Button></Link>
                <ul className="mt-7 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-zinc-300">
                      <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', p.featured ? 'bg-violet-500/30 text-violet-200' : 'bg-white/10 text-zinc-300')}><Check className="h-2.5 w-2.5" /></span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Roadmap() {
  const trl = [
    ['I', 'Idea'], ['II', 'Koncepcja'], ['III', 'Weryfikacja koncepcji'], ['IV', 'Moduły w laboratorium'], ['V', 'Środowisko zbliżone'],
    ['VI', 'Demonstracja prototypu'], ['VII', 'Warunki operacyjne'], ['VIII', 'Ostateczna forma'], ['IX', 'Komercjalizacja'],
  ];
  const current = 6;
  return (
    <section id="trl" className="scroll-mt-20 px-5 py-24">
      <SectionTitle eyebrow="Droga projektu" title={<>Od pomysłu do produktu: <span className="text-gradient">TRL I–IX</span></>} text="SmartStudy rozwijamy etapowo, zgodnie z poziomami gotowości technologicznej i pryncypiami PRINCE2." />
      <div className="mx-auto max-w-6xl overflow-x-auto pb-4">
        <div className="relative flex min-w-[860px] justify-between px-4">
          <div className="absolute left-8 right-8 top-6 h-0.5 bg-white/10" />
          <motion.div className="absolute left-8 top-6 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_12px_#8b5cf6]" initial={{ width: 0 }} whileInView={{ width: `calc((100% - 4rem) * ${(current - 1) / 8})` }} viewport={{ once: true }} transition={{ duration: 1.6, ease: 'easeOut' }} />
          {trl.map(([n, l], i) => (
            <motion.div key={n} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative flex w-24 flex-col items-center text-center">
              <div className={cn('relative grid h-12 w-12 place-items-center rounded-full border font-display text-sm font-bold',
                i + 1 < current ? 'border-violet-400/50 bg-violet-500/20 text-violet-100' : i + 1 === current ? 'border-cyan-300 bg-cyan-400/20 text-white shadow-glow-cyan' : 'border-white/10 bg-ink-900 text-zinc-500')}>
                {i + 1 === current && <span className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-300" />}
                {n}
              </div>
              <div className={cn('mt-3 text-xs', i + 1 <= current ? 'text-zinc-200' : 'text-zinc-500')}>{l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ onDemo, demoLoading }: { onDemo: () => void; demoLoading: boolean }) {
  return (
    <section className="px-5 py-24">
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-white/10 p-10 text-center sm:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700/40 via-ink-900 to-cyan-600/30" />
        <div className="dot-bg mask-radial absolute inset-0" />
        <div className="absolute -left-20 -top-20 h-72 w-72 animate-aurora rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="relative">
          <h2 className="text-balance text-4xl font-bold sm:text-6xl">Najbliższy egzamin<br /><span className="text-gradient-animated">nie musi być stresem.</span></h2>
          <p className="mx-auto mt-5 max-w-xl text-zinc-300/80">Załóż konto i wygeneruj pierwszy plan w mniej niż dwie minuty. Bez karty, bez zobowiązań.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register"><Button size="lg" icon={<Sparkles className="h-4 w-4" />}>Zacznij teraz</Button></Link>
            <Button size="lg" variant="secondary" onClick={onDemo} loading={demoLoading}>Zobacz demo</Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-5 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
        <Logo />
        <p className="text-center">Projekt ZPI · Uniwersytet Warmińsko-Mazurski w Olsztynie · Igor Barcikowski, Roman Vaitsiuk</p>
        <p>© {new Date().getFullYear()} SmartStudy</p>
      </div>
    </footer>
  );
}
