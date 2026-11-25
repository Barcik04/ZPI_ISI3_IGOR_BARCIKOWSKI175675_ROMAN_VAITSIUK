import { AnimatePresence, motion } from 'framer-motion';
import { Crown, LogOut, Menu, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Aurora, Logo } from '@/components/Decor';
import { Kbd } from '@/components/ui/misc';
import { cn, fmt, todayISO } from '@/lib/utils';
import { NAV } from './nav';
import { CommandPalette } from './CommandPalette';

export function Avatar({ name, hue, size = 36 }: { name: string; hue: number; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-display text-xs font-semibold text-white ring-2 ring-white/10"
      style={{ width: size, height: size, background: `conic-gradient(from 210deg, hsl(${hue} 85% 60%), hsl(${(hue + 80) % 360} 85% 55%), hsl(${hue} 85% 60%))` }}
    >
      {initials}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, report } = useApp();
  const nav = useNavigate();
  if (!user) return null;
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <NavLink to="/app" onClick={onNavigate}><Logo /></NavLink>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="label mb-2 px-3">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/app'} onClick={onNavigate}
                  className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-100')}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-white/10 bg-gradient-to-r from-violet-500/20 via-white/[0.04] to-transparent" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400 shadow-[0_0_12px_#a78bfa]" />
                        </motion.span>
                      )}
                      <item.icon className={cn('relative h-[18px] w-[18px] transition', isActive ? 'text-violet-300' : 'group-hover:text-zinc-200', item.accent && !isActive && 'text-fuchsia-300')} />
                      <span className="relative">{item.label}</span>
                      {item.accent && <span className="relative ml-auto rounded-md bg-gradient-to-r from-violet-500 to-cyan-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">AI</span>}
                      {item.to === '/app/plan' && report && !report.feasible && <span className="relative ml-auto h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 p-3">
        {user.plan === 'free' ? (
          <button onClick={() => { nav('/app/settings#plan'); onNavigate?.(); }} className="group relative block w-full overflow-hidden rounded-2xl border border-violet-400/20 p-4 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/10 to-cyan-500/20 transition group-hover:opacity-80" />
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/40 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Crown className="h-4 w-4 text-amber-300" /> Przejdź na Premium</div>
              <p className="mt-1 text-xs text-zinc-300/80">Bez limitu przedmiotów, notatki odręczne i więcej AI. 99 zł / rok.</p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-400/10 to-transparent px-4 py-3 text-xs text-amber-100">
            <Crown className="h-4 w-4 text-amber-300" /> <span className="font-semibold">SmartStudy Premium</span>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <Avatar name={user.name} hue={user.avatarHue} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-zinc-500">{user.email}</div>
          </div>
          <button onClick={logout} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white" aria-label="Wyloguj" title="Wyloguj">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, ready, setPaletteOpen, report } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  if (!ready) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="relative min-h-dvh">
      <Aurora intensity={0.55} />
      <div className="noise" />
      <CommandPalette />

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-white/[0.06] bg-ink-950/60 backdrop-blur-2xl lg:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/10 bg-ink-900/95 backdrop-blur-2xl lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <button className="absolute right-3 top-6 grid h-9 w-9 place-items-center rounded-xl text-zinc-400 hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Zamknij menu"><X className="h-5 w-5" /></button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-ink-950/50 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button className="grid h-9 w-9 place-items-center rounded-xl text-zinc-300 hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
            <div className="lg:hidden"><Logo compact /></div>
            <button onClick={() => setPaletteOpen(true)} className="group flex h-10 min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 text-sm text-zinc-500 transition hover:border-white/15 hover:bg-white/[0.05] sm:max-w-md">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Szukaj lub wpisz polecenie…</span>
              <span className="ml-auto hidden items-center gap-1 sm:flex"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
            </button>
            <div className="ml-auto hidden items-center gap-3 md:flex">
              {report && (
                <div className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs', report.feasible ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200' : 'border-amber-400/25 bg-amber-400/[0.08] text-amber-200')}>
                  <span className="relative flex h-2 w-2">
                    <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', report.feasible ? 'bg-emerald-400' : 'bg-amber-400')} />
                    <span className={cn('relative inline-flex h-2 w-2 rounded-full', report.feasible ? 'bg-emerald-400' : 'bg-amber-400')} />
                  </span>
                  {report.feasible ? 'Plan wykonalny' : 'Plan wymaga korekty'}
                </div>
              )}
              <div className="text-right text-xs leading-tight">
                <div className="font-medium capitalize text-zinc-200">{fmt(todayISO(), 'EEEE')}</div>
                <div className="text-zinc-500">{fmt(todayISO(), 'd MMMM yyyy')}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Aurora />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
        <Logo />
        <div className="flex items-center gap-2 text-xs text-zinc-500"><Sparkles className="h-3.5 w-3.5 animate-pulse text-violet-400" /> Ładowanie Twojego planu…</div>
      </motion.div>
    </div>
  );
}

