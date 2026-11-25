import { motion } from 'framer-motion';
import { Bell, Check, Clock3, Crown, RefreshCw, Save, Settings as SettingsIcon, Sparkles, User as UserIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AvailabilityBars, PreferredTime } from '@/components/Availability';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader, Segmented, Toggle } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/layout/AppLayout';
import { api } from '@/lib/api';
import type { Settings } from '@/lib/types';
import { celebrate, cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, setUser, handleReport } = useApp();
  const loc = useLocation();
  const [name, setName] = useState(user!.name);
  const [s, setS] = useState<Settings>(user!.settings);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(user!.settings) || name !== user!.name;

  useEffect(() => {
    if (loc.hash === '#plan') setTimeout(() => document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }, [loc.hash]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.updateMe({ name, settings: s });
      setUser(r.user);
      handleReport(r.report);
      toast.success('Ustawienia zapisane', { description: r.report ? `Plan przeliczony · ${r.report.totalSessions} sesji` : undefined });
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const setPlan = async (plan: 'free' | 'premium') => {
    setUpgrading(true);
    try {
      await new Promise((r) => setTimeout(r, plan === 'premium' ? 1100 : 300));
      const r = await api.updateMe({ plan });
      setUser(r.user);
      if (plan === 'premium') { celebrate(2.5); toast.success('Witaj w Premium! 👑', { description: 'Płatność symulowana – wersja demonstracyjna.' }); }
      else toast('Przełączono na plan Free');
    } finally { setUpgrading(false); }
  };

  if (!user) return null;
  const premium = user.plan === 'premium';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<><SettingsIcon className="h-3.5 w-3.5" />Konto</>} title="Ustawienia" subtitle="Dostępność i preferencje są wejściem dla algorytmu planowania – po zapisaniu plan przelicza się automatycznie."
        actions={<Button onClick={save} loading={saving} disabled={!dirty} icon={<Save className="h-4 w-4" />}>Zapisz zmiany</Button>} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <CardHeader title="Dostępny czas nauki" subtitle="Minuty na każdy dzień tygodnia" icon={<Clock3 className="h-4 w-4" />} />
          <div className="mt-6"><AvailabilityBars value={s.availability} onChange={(availability) => setS({ ...s, availability })} /></div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <CardHeader title="Profil" icon={<UserIcon className="h-4 w-4" />} />
            <div className="mt-5 flex items-center gap-4">
              <Avatar name={name || user.name} hue={user.avatarHue} size={56} />
              <div className="flex-1 space-y-2">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="text-xs text-zinc-500">{user.email}</div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <CardHeader title="Preferencje planu" icon={<Sparkles className="h-4 w-4" />} />
            <div className="mt-5 space-y-5">
              <div><span className="label mb-2 block">Pora nauki</span><PreferredTime value={s.preferredTime} onChange={(preferredTime) => setS({ ...s, preferredTime })} /></div>
              <div><span className="label mb-2 block">Maks. długość sesji</span>
                <Segmented value={String(s.sessionLength)} onChange={(v) => setS({ ...s, sessionLength: Number(v) })} className="w-full" options={['25', '50', '75', '90'].map((v) => ({ value: v, label: `${v} min` }))} />
              </div>
              <Row icon={<RefreshCw className="h-4 w-4" />} t="Automatyczna korekta" d="Przeliczaj plan po oznaczeniu sesji jako opuszczonej"><Toggle checked={s.autoReplan} onChange={(autoReplan) => setS({ ...s, autoReplan })} label="Automatyczna korekta" /></Row>
              <Row icon={<Bell className="h-4 w-4" />} t="Powiadomienia" d="Przypomnienia o sesjach i powtórkach"><Toggle checked={s.notifications} onChange={(notifications) => setS({ ...s, notifications })} label="Powiadomienia" /></Row>
            </div>
          </Card>
        </div>
      </div>

      <div id="plan" className="scroll-mt-24">
        <Card className="relative overflow-hidden p-6 sm:p-8" spotlight={false}>
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="label mb-2 flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-amber-300" />Subskrypcja</div>
              <h2 className="text-2xl font-semibold">Twój plan: <span className={premium ? 'text-amber-300' : 'text-white'}>{premium ? 'Premium' : 'Free'}</span></h2>
            </div>
            <p className="text-xs text-zinc-500">Model freemium · płatność w wersji demo jest symulowana</p>
          </div>
          <div className="relative mt-6 grid gap-4 md:grid-cols-2">
            <PlanCard active={!premium} name="Free" price="0 zł" items={['Do 3 przedmiotów', 'Plan z powtórkami i auto-korektą', 'Notatki tekstowe', 'Asystent – tryb podstawowy']}
              action={premium && <Button variant="secondary" className="w-full" onClick={() => setPlan('free')} loading={upgrading}>Przejdź na Free</Button>} />
            <PlanCard active={premium} featured name="Premium" price="99 zł / rok" items={['Nielimitowane przedmioty', 'Analiza sylabusów i notatek AI', 'Notatki odręczne z rysikiem', 'Fiszki, quizy, pełne statystyki', 'Integracja z kalendarzem (wkrótce)']}
              action={!premium && <Button className="w-full" onClick={() => setPlan('premium')} loading={upgrading} icon={<Crown className="h-4 w-4" />}>Aktywuj Premium</Button>} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, t, d, children }: { icon: ReactNode; t: string; d: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] text-zinc-400">{icon}</div>
      <div className="flex-1"><div className="text-sm text-white">{t}</div><div className="text-xs text-zinc-500">{d}</div></div>
      {children}
    </div>
  );
}

function PlanCard({ active, featured, name, price, items, action }: { active: boolean; featured?: boolean; name: string; price: string; items: string[]; action?: ReactNode }) {
  return (
    <motion.div layout className={cn('relative rounded-3xl border p-6 transition', active ? (featured ? 'border-amber-300/40 bg-gradient-to-br from-amber-400/10 to-transparent shadow-[0_20px_60px_-30px_rgba(251,191,36,.6)]' : 'border-violet-400/40 bg-violet-500/[0.06]') : 'border-white/[0.08] bg-white/[0.02]')}>
      {active && <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"><Check className="h-3 w-3" />Aktywny</span>}
      <div className="flex items-center gap-2 font-display text-lg font-semibold text-white">{featured && <Crown className="h-4 w-4 text-amber-300" />}{name}</div>
      <div className="mt-1 font-display text-3xl font-bold text-white">{price}</div>
      <ul className="mt-5 space-y-2 text-sm text-zinc-300">{items.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />{i}</li>)}</ul>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
