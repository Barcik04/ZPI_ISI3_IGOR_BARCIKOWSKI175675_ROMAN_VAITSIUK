import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Brain, CalendarCheck2, Eye, EyeOff, Lock, Mail, Play, Sparkles, User as UserIcon } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Aurora, Logo } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState<'form' | 'demo' | null>(null);
  const isLogin = mode === 'login';

  if (user) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading('form');
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
      toast.success(isLogin ? 'Witaj ponownie! 👋' : 'Konto utworzone – czas na pierwszy plan ✨');
      nav(isLogin ? '/app' : '/app/wizard');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const demo = async () => {
    setLoading('demo');
    try {
      await login('demo@smartstudy.pl', 'demo123');
      nav('/app');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <Aurora />
      <div className="noise" />
      <div className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Strona główna</Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
              <h1 className="text-4xl font-bold">{isLogin ? 'Witaj ponownie' : 'Załóż konto'}</h1>
              <p className="mt-2 text-sm text-zinc-400">{isLogin ? 'Zaloguj się, żeby wrócić do swojego planu.' : 'Za chwilę AI ułoży Twój pierwszy plan nauki.'}</p>

              <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm">
                {(['login', 'register'] as const).map((m) => (
                  <Link key={m} to={`/${m}`} className={cn('relative rounded-lg py-2 text-center font-medium transition', mode === m ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                    {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-white/10" />}
                    <span className="relative">{m === 'login' ? 'Logowanie' : 'Rejestracja'}</span>
                  </Link>
                ))}
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {!isLogin && (
                  <Field icon={<UserIcon className="h-4 w-4" />} label="Imię i nazwisko">
                    <input className="input pl-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" autoComplete="name" required />
                  </Field>
                )}
                <Field icon={<Mail className="h-4 w-4" />} label="E-mail">
                  <input className="input pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ty@uczelnia.pl" autoComplete="email" required />
                </Field>
                <Field icon={<Lock className="h-4 w-4" />} label="Hasło">
                  <input className="input pl-10 pr-10" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? '••••••••' : 'min. 6 znaków'} autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength={6} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200" aria-label="Pokaż hasło">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={loading === 'form'}>{isLogin ? 'Zaloguj się' : 'Utwórz konto'}</Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-zinc-600"><div className="h-px flex-1 bg-white/10" />lub<div className="h-px flex-1 bg-white/10" /></div>
              <Button variant="outline" size="lg" className="w-full" onClick={demo} loading={loading === 'demo'} icon={<Play className="h-4 w-4 fill-current" />}>Wejdź na konto demo</Button>
              <p className="mt-3 text-center text-xs text-zinc-600">demo@smartstudy.pl · demo123</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-white/[0.06] lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-ink-950 to-cyan-900/30" />
        <div className="dot-bg absolute inset-0 opacity-50" />
        <div className="relative flex h-full flex-col items-center justify-center p-12">
          <div className="relative h-[420px] w-full max-w-md">
            <OrbitCard className="left-0 top-0" delay={0} icon={<CalendarCheck2 className="h-5 w-5" />} color="#8b5cf6" title="Plan wygenerowany" text="38 sesji · 24 dni · wykonalny" />
            <OrbitCard className="right-0 top-32" delay={0.2} icon={<Brain className="h-5 w-5" />} color="#22d3ee" title="Powtórka 2/3" text="Normalizacja – dziś o 18:00" />
            <OrbitCard className="bottom-6 left-8" delay={0.4} icon={<Sparkles className="h-5 w-5" />} color="#f472b6" title="AI rozpoznało 12 tematów" text="Średnia trudność 3,4 / 5" />
          </div>
          <blockquote className="mt-6 max-w-md text-center">
            <p className="font-display text-2xl font-medium leading-snug text-white">„Pierwszy raz od początku studiów zaczęłam się uczyć do sesji <span className="text-gradient">dwa tygodnie wcześniej</span>.”</p>
            <footer className="mt-4 text-sm text-zinc-500">— przykładowa opinia (treść demonstracyjna)</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</span>
        {children}
      </div>
    </label>
  );
}

function OrbitCard({ className, icon, color, title, text, delay }: { className: string; icon: ReactNode; color: string; title: string; text: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.3 + delay, type: 'spring', damping: 18 }} className={cn('absolute', className)}>
      <div className="glass-strong animate-float flex items-center gap-3 rounded-2xl p-4 pr-6 shadow-2xl" style={{ animationDelay: `${delay * 5}s`, boxShadow: `0 20px 60px -20px ${color}80` }}>
        <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}>{icon}</div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-zinc-400">{text}</div>
        </div>
      </div>
    </motion.div>
  );
}
