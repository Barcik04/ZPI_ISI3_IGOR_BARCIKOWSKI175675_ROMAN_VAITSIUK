import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive, BookOpen, CheckCircle2, Clock3, Crown, EyeOff, Library, Pencil, Plus, ScanText, Trash2, Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SUBJECT_ICONS, SubjectIcon } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, DifficultyDots, EmptyState, Modal, PageHeader, ProgressBar, ProgressRing, Segmented } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { api, ApiError } from '@/lib/api';
import type { PlanReport, Subject, Topic } from '@/lib/types';

type Call = (p: Promise<{ report: PlanReport | null }>, msg?: string) => Promise<void>;
import { addDaysISO, celebrate, cn, daysLabel, fmt, minutes, SUBJECT_COLORS, todayISO } from '@/lib/utils';

export default function Subjects() {
  const { subjects } = useApp();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<'active' | 'archive'>('active');
  const openId = params.get('id');
  const creating = params.get('new') === '1';
  const open = subjects.find((s) => s.id === openId) ?? null;
  const list = subjects.filter((s) => (filter === 'active' ? s.daysLeft >= 0 : s.daysLeft < 0));

  return (
    <div>
      <PageHeader eyebrow={<><Library className="h-3.5 w-3.5" />Egzaminy i materiał</>} title="Przedmioty" subtitle="Każdy przedmiot to termin, lista tematów z trudnością i szacowanym czasem. Zmiany od razu przeliczają plan."
        actions={<>
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Aktywne' }, { value: 'archive', label: <><Archive className="h-3.5 w-3.5" />Archiwum</> }]} />
          <Button onClick={() => setParams({ new: '1' })} icon={<Plus className="h-4 w-4" />}>Dodaj przedmiot</Button>
        </>} />

      {list.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s, i) => <SubjectCard key={s.id} s={s} i={i} onOpen={() => setParams({ id: s.id })} />)}
          {filter === 'active' && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: list.length * 0.06 }} onClick={() => setParams({ new: '1' })}
              className="group grid min-h-[260px] place-items-center rounded-3xl border-2 border-dashed border-white/10 text-zinc-500 transition hover:border-violet-400/40 hover:bg-violet-500/[0.04] hover:text-violet-200">
              <div className="flex flex-col items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] transition group-hover:scale-110 group-hover:rotate-90"><Plus className="h-6 w-6" /></div>
                <span className="text-sm font-medium">Nowy przedmiot</span>
              </div>
            </motion.button>
          )}
        </div>
      ) : (
        <Card><EmptyState icon={<BookOpen className="h-7 w-7" />} title={filter === 'active' ? 'Brak aktywnych przedmiotów' : 'Archiwum jest puste'} text="Dodaj przedmiot ręcznie albo użyj Kreatora AI, który rozpozna tematy z sylabusa."
          action={filter === 'active' && <Button onClick={() => setParams({ new: '1' })} icon={<Plus className="h-4 w-4" />}>Dodaj przedmiot</Button>} /></Card>
      )}

      <SubjectForm open={creating} onClose={() => setParams({})} />
      <SubjectDetail subject={open} onClose={() => setParams({})} />
    </div>
  );
}

function SubjectCard({ s, i, onOpen }: { s: Subject; i: number; onOpen: () => void }) {
  const learned = s.topics.filter((t) => t.learnedAt).length;
  const mastery = s.topics.length ? Math.round(s.topics.reduce((a, t) => a + t.mastery, 0) / s.topics.length) : 0;
  const urgent = s.daysLeft >= 0 && s.daysLeft <= 5;
  return (
    <Card delay={i * 0.06} onClick={onOpen} className="group relative cursor-pointer overflow-hidden p-6 transition-transform hover:-translate-y-1" glow={`${s.color}55`}>
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl transition-opacity group-hover:opacity-50" style={{ background: s.color }} />
      <div className="relative flex items-start justify-between">
        <SubjectIcon icon={s.icon} color={s.color} size="lg" />
        <div className="text-right">
          <div className={cn('font-display text-4xl font-bold leading-none', urgent ? 'text-amber-300' : 'text-white')}>{s.daysLeft >= 0 ? s.daysLeft : '✓'}</div>
          <div className="mt-1 text-[11px] text-zinc-500">{s.daysLeft >= 0 ? (s.daysLeft === 1 ? 'dzień' : 'dni') : 'zakończony'}</div>
        </div>
      </div>
      <h3 className="relative mt-5 line-clamp-2 text-lg font-semibold">{s.name}</h3>
      <div className="relative mt-1 flex items-center gap-2 text-xs text-zinc-500">
        <span className="capitalize">{s.examType}</span>·<span>{fmt(s.examDate, 'd MMMM yyyy')}</span>
      </div>
      <div className="relative mt-6 flex items-center gap-5">
        <ProgressRing value={s.progress} size={74} stroke={7} colors={[s.color, '#ffffff']}>
          <span className="font-display text-sm font-bold text-white">{s.progress}%</span>
        </ProgressRing>
        <div className="flex-1 space-y-2 text-xs">
          <div className="flex justify-between text-zinc-400"><span>Tematy opanowane</span><span className="font-semibold text-white">{learned}/{s.topics.length}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Śr. opanowanie</span><span className="font-semibold text-white">{mastery}%</span></div>
          <div className="flex justify-between text-zinc-400"><span>Materiał</span><span className="font-semibold text-white">{minutes(s.totalMinutes)}</span></div>
        </div>
      </div>
      <div className="relative mt-5 flex gap-1">
        {s.topics.map((t) => (
          <div key={t.id} className="h-1.5 flex-1 rounded-full" title={t.title}
            style={{ background: t.skipped ? 'rgba(255,255,255,.05)' : t.status === 'mastered' ? s.color : t.learnedAt ? `${s.color}88` : 'rgba(255,255,255,.1)' }} />
        ))}
      </div>
    </Card>
  );
}

function SubjectForm({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Subject }) {
  const { handleReport, user } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState(addDaysISO(todayISO(), 14));
  const [examType, setExamType] = useState('egzamin');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState('book');
  const [difficulty, setDifficulty] = useState(3);
  const [loading, setLoading] = useState(false);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(edit?.name ?? '');
    setExamDate(edit?.examDate ?? addDaysISO(todayISO(), 14));
    setExamType(edit?.examType ?? 'egzamin');
    setColor(edit?.color ?? SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
    setIcon(edit?.icon ?? 'book');
    setDifficulty(edit?.difficulty ?? 3);
    setPaywall(false);
  }, [open, edit]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (edit) {
        const r = await api.updateSubject(edit.id, { name, examDate, examType, color, icon, difficulty });
        handleReport(r.report);
        toast.success('Zapisano zmiany');
        onClose();
      } else {
        const r = await api.createSubject({ name, examDate, examType, color, icon, difficulty });
        handleReport(r.report);
        toast.success(`Dodano „${name}”`, { description: 'Dodaj tematy ręcznie lub wklej sylabus do analizy AI.' });
        nav(`/app/subjects?id=${r.subject.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setPaywall(true);
      else toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edytuj przedmiot' : 'Nowy przedmiot'} subtitle={edit ? undefined : 'Termin i podstawowe informacje. Tematy dodasz w kolejnym kroku.'}>
      {paywall ? (
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300"><Crown className="h-7 w-7" /></div>
          <h3 className="text-lg font-semibold">Limit planu Free</h3>
          <p className="mt-2 text-sm text-zinc-400">Plan Free obejmuje 3 przedmioty. Premium to nielimitowane przedmioty i analiza AI – 99 zł rocznie.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={onClose}>Później</Button>
            <Button onClick={() => nav('/app/settings#plan')} icon={<Crown className="h-4 w-4" />}>Zobacz Premium</Button>
          </div>
          {user?.plan === 'free' && <p className="mt-3 text-[11px] text-zinc-600">Wersja demonstracyjna – płatność jest symulowana.</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="label mb-2 block">Nazwa</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Algorytmy i struktury danych" required autoFocus /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label mb-2 block">Data</span><input type="date" className="input [color-scheme:dark]" value={examDate} min={edit ? undefined : todayISO()} onChange={(e) => setExamDate(e.target.value)} required /></label>
            <div><span className="label mb-2 block">Forma</span>
              <Segmented value={examType} onChange={setExamType} className="w-full" options={['egzamin', 'kolokwium', 'zaliczenie'].map((v) => ({ value: v, label: <span className="capitalize">{v}</span> }))} />
            </div>
          </div>
          <div>
            <span className="label mb-2 block">Kolor</span>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)} className={cn('h-8 w-8 rounded-full transition', color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-ink-900' : 'hover:scale-110')} style={{ background: c, boxShadow: `0 0 14px ${c}66` }} aria-label={c} />
              ))}
            </div>
          </div>
          <div>
            <span className="label mb-2 block">Ikona</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUBJECT_ICONS).map(([k, I]) => (
                <button type="button" key={k} onClick={() => setIcon(k)} className={cn('grid h-10 w-10 place-items-center rounded-xl border transition', icon === k ? 'text-white' : 'border-white/10 text-zinc-500 hover:text-zinc-200')}
                  style={icon === k ? { borderColor: color, background: `${color}22`, color } : undefined}><I className="h-4 w-4" /></button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div><div className="text-sm text-white">Ogólna trudność przedmiotu</div><div className="text-xs text-zinc-500">Wpływa na priorytet w planie</div></div>
            <DifficultyDots value={difficulty} onChange={setDifficulty} color={color} size="md" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Anuluj</Button>
            <Button type="submit" loading={loading}>{edit ? 'Zapisz' : 'Utwórz przedmiot'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SubjectDetail({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const { handleReport } = useApp();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDiff, setNewDiff] = useState(3);
  const [newMin, setNewMin] = useState(45);
  const [confirmDel, setConfirmDel] = useState(false);
  const [last, setLast] = useState<Subject | null>(subject);
  useEffect(() => { if (subject) setLast(subject); setConfirmDel(false); }, [subject]);
  const s = subject ?? last;

  const sorted = useMemo(() => s?.topics ?? [], [s]);
  if (!s) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  const call: Call = async (p, msg) => {
    try { const r = await p; handleReport(r.report); if (msg) toast.success(msg); } catch (e) { toast.error((e as Error).message); }
  };
  const addTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await call(api.addTopics(s.id, [{ title: newTitle, difficulty: newDiff, estMinutes: newMin }]), 'Temat dodany – plan przeliczony');
    setNewTitle('');
  };

  return (
    <>
      <Modal open={!!subject && !editing} onClose={onClose} wide
        title={<span className="flex items-center gap-3"><SubjectIcon icon={s.icon} color={s.color} size="md" /><span>{s.name}</span></span>}
        subtitle={<span className="capitalize">{s.examType} · {fmt(s.examDate, 'EEEE, d MMMM yyyy')} · {daysLabel(s.daysLeft)}</span>}>
        <div className="grid gap-3 sm:grid-cols-4">
          {[['Postęp', `${s.progress}%`], ['Tematy', `${s.topics.filter((t) => !t.skipped).length}`], ['Materiał', minutes(s.totalMinutes)], ['Opanowane', `${s.topics.filter((t) => t.status === 'mastered').length}`]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[11px] text-zinc-500">{l}</div><div className="font-display text-xl font-semibold text-white">{v}</div></div>
          ))}
        </div>
        <div className="mt-3"><ProgressBar value={s.progress} color={s.color} height={8} /></div>

        <div className="mt-6 flex items-center justify-between">
          <h3 className="font-semibold">Tematy</h3>
          <Button size="sm" variant="outline" onClick={() => nav(`/app/analyze?subject=${s.id}`)} icon={<ScanText className="h-3.5 w-3.5" />}>Wczytaj z sylabusa (AI)</Button>
        </div>
        <div className="mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((t) => <TopicRow key={t.id} t={t} color={s.color} call={call} />)}
          </AnimatePresence>
          {!sorted.length && <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">Brak tematów. Dodaj pierwszy poniżej lub użyj analizy AI.</p>}
        </div>

        <form onSubmit={addTopic} className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center">
          <input className="input flex-1" placeholder="Nowy temat, np. Drzewa AVL" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="flex items-center gap-3">
            <DifficultyDots value={newDiff} onChange={setNewDiff} color={s.color} />
            <select className="input w-24 py-2" value={newMin} onChange={(e) => setNewMin(Number(e.target.value))}>
              {[20, 30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
            <Button type="submit" size="icon" aria-label="Dodaj temat"><Plus className="h-4 w-4" /></Button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-white/[0.06] pt-5">
          {confirmDel ? (
            <div className="flex items-center gap-2 text-sm text-rose-200">Na pewno? Usunie to tematy i sesje.
              <Button size="sm" variant="danger" onClick={async () => { await call(api.deleteSubject(s.id), 'Przedmiot usunięty'); onClose(); }}>Usuń</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>Anuluj</Button>
            </div>
          ) : <Button size="sm" variant="danger" onClick={() => setConfirmDel(true)} icon={<Trash2 className="h-3.5 w-3.5" />}>Usuń przedmiot</Button>}
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)} icon={<Pencil className="h-3.5 w-3.5" />}>Edytuj</Button>
        </div>
      </Modal>
      <SubjectForm open={editing} onClose={() => setEditing(false)} edit={s} />
    </>
  );
}

function TopicRow({ t, color, call }: { t: Topic; color: string; call: Call }) {
  const status = t.skipped ? { l: 'pominięty', c: 'text-zinc-500 border-white/10 bg-white/5' } : t.status === 'mastered' ? { l: 'opanowany', c: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10' } : t.learnedAt ? { l: 'w powtórkach', c: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10' } : t.learnedMinutes ? { l: 'w trakcie', c: 'text-violet-300 border-violet-400/30 bg-violet-400/10' } : { l: 'nowy', c: 'text-zinc-400 border-white/10 bg-white/5' };
  return (
    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className={cn('group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center', t.skipped && 'opacity-50')}>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm font-medium text-zinc-100', t.skipped && 'line-through')}>{t.title}</div>
        <div className="mt-1.5 flex items-center gap-3">
          <Badge className={status.c}>{status.l}</Badge>
          <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Clock3 className="h-3 w-3" />{t.estMinutes} min</span>
          <div className="hidden w-24 sm:block"><ProgressBar value={t.mastery} color={color} height={4} /></div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DifficultyDots value={t.difficulty} color={color} onChange={(v) => call(api.updateTopic(t.id, { difficulty: v }))} />
        <div className="flex items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          {t.status !== 'mastered' && !t.skipped && (
            <button title="Oznacz jako opanowany" onClick={() => { celebrate(0.4); call(api.updateTopic(t.id, { mastered: true }), 'Temat opanowany! 🎉'); }} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-emerald-400/15 hover:text-emerald-300"><CheckCircle2 className="h-4 w-4" /></button>
          )}
          <button title={t.skipped ? 'Przywróć do planu' : 'Pomiń w planie'} onClick={() => call(api.updateTopic(t.id, { skipped: !t.skipped }), t.skipped ? 'Przywrócono temat' : 'Temat pominięty')} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-white">
            {t.skipped ? <Undo2 className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button title="Usuń" onClick={() => call(api.deleteTopic(t.id), 'Temat usunięty')} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </motion.div>
  );
}

