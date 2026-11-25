import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot, Check, CloudUpload, Eye, FilePlus2, Image as ImageIcon, Loader2, NotebookPen, Pencil, Pin, PinOff, Search, Sparkles, Trash2, Type,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Analyzer, type EditableTopic } from '@/components/Analyzer';
import { Markdown } from '@/components/Decor';
import { DrawingCanvas, type DrawingHandle } from '@/components/DrawingCanvas';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, Modal, PageHeader, Segmented, Skeleton, Toggle } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';
import { celebrate, cn } from '@/lib/utils';

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'przed chwilą';
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  if (s < 86400) return `${Math.floor(s / 3600)} h temu`;
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};

export default function Notes() {
  const { subjects } = useApp();
  const [params, setParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    api.notes().then((n) => { setNotes(n); setActiveId((a) => a ?? n[0]?.id ?? null); }).catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (params.get('new') === '1' && notes) { setParams({}); create(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, notes]);

  const create = async () => {
    const n = await api.createNote({ title: 'Nowa notatka', content: '', subjectId: subjectFilter || null });
    setNotes((prev) => [n, ...(prev ?? [])]);
    setActiveId(n.id);
  };

  const patchLocal = (n: Note) => setNotes((prev) => prev?.map((x) => (x.id === n.id ? n : x)) ?? null);
  const remove = async (id: string) => {
    await api.deleteNote(id);
    setNotes((prev) => { const next = prev?.filter((x) => x.id !== id) ?? []; setActiveId(next[0]?.id ?? null); return next; });
    toast.success('Notatka usunięta');
  };

  const list = useMemo(() => (notes ?? [])
    .filter((n) => (!subjectFilter || n.subjectId === subjectFilter) && (n.title + n.content).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [notes, q, subjectFilter]);
  const active = notes?.find((n) => n.id === activeId) ?? null;
  const subjMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div>
      <PageHeader eyebrow={<><NotebookPen className="h-3.5 w-3.5" />Moduł 5</>} title="Notatki" subtitle="Pisz tekstem lub rysikiem na tablecie. Notatki z dostępem dla AI pomagają asystentowi i fiszkom."
        actions={<Button onClick={create} icon={<FilePlus2 className="h-4 w-4" />}>Nowa notatka</Button>} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex max-h-[calc(100dvh-220px)] flex-col p-3 lg:sticky lg:top-24" spotlight={false}>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input className="input pl-9" placeholder="Szukaj w notatkach…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input mb-3 py-2 text-xs" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">Wszystkie przedmioty</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
            {!notes ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />) : !list.length ? <p className="py-10 text-center text-sm text-zinc-500">Brak notatek</p> : list.map((n) => {
              const s = n.subjectId ? subjMap.get(n.subjectId) : null;
              return (
                <motion.button layout key={n.id} onClick={() => setActiveId(n.id)}
                  className={cn('relative w-full rounded-xl border p-3 text-left transition', n.id === activeId ? 'border-violet-400/30 bg-violet-500/10' : 'border-transparent hover:bg-white/[0.04]')}>
                  <div className="flex items-center gap-2">
                    {n.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-300" />}
                    <span className="truncate text-sm font-medium text-zinc-100">{n.title || 'Bez tytułu'}</span>
                    {n.drawing && <ImageIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-cyan-300" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{n.content.replace(/[#*_`-]/g, '').slice(0, 120) || (n.drawing ? 'Notatka odręczna' : 'Pusta notatka')}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-600">
                    {s && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.name}</span>}
                    <span className="ml-auto">{ago(n.updatedAt)}</span>
                    {n.aiAccess && <Bot className="h-3 w-3 text-violet-300" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {active ? <Editor key={active.id} note={active} onSaved={patchLocal} onDelete={() => remove(active.id)} /> : notes && (
            <Card><EmptyState icon={<Pencil className="h-7 w-7" />} title="Wybierz lub utwórz notatkę" text="Twórz notatki tekstowe w markdown albo pisz odręcznie rysikiem." action={<Button onClick={create}>Nowa notatka</Button>} /></Card>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Editor({ note, onSaved, onDelete }: { note: Note; onSaved: (n: Note) => void; onDelete: () => void }) {
  const { subjects, handleReport } = useApp();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tab, setTab] = useState<'text' | 'draw'>(note.drawing && !note.content ? 'draw' : 'text');
  const [preview, setPreview] = useState(!!note.content);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [drawDirty, setDrawDirty] = useState(false);
  const [extract, setExtract] = useState(false);
  const [extracted, setExtracted] = useState<EditableTopic[]>([]);
  const [target, setTarget] = useState(note.subjectId ?? subjects.find((s) => s.daysLeft >= 0)?.id ?? '');
  const [confirmDel, setConfirmDel] = useState(false);
  const canvas = useRef<DrawingHandle>(null);
  const timer = useRef<number>();

  const save = async (data: Partial<Note>) => {
    setSaving('saving');
    try { const n = await api.updateNote(note.id, data); onSaved(n); setSaving('saved'); } catch (e) { toast.error((e as Error).message); setSaving('idle'); }
  };

  useEffect(() => {
    if (title === note.title && content === note.content) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save({ title, content }), 700);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const saveDrawing = async () => {
    const data = canvas.current?.isEmpty() ? null : canvas.current?.toDataURL();
    await save({ drawing: data ?? null });
    setDrawDirty(false);
    toast.success('Notatka odręczna zapisana', { description: 'Obraz zachowany bez strat.' });
  };

  const addExtracted = async () => {
    const sel = extracted.filter((t) => t.selected);
    if (!target || !sel.length) return;
    const r = await api.addTopics(target, sel.map(({ title, difficulty, estMinutes }) => ({ title, difficulty, estMinutes })));
    handleReport(r.report);
    celebrate(1);
    toast.success(`Dodano ${r.topics.length} tematów do planu`);
    setExtract(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <Card className="p-5 sm:p-6" spotlight={false}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold text-white outline-none placeholder:text-zinc-600" placeholder="Tytuł notatki" />
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {saving === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Zapisywanie…</> : saving === 'saved' ? <><Check className="h-3.5 w-3.5 text-emerald-400" />Zapisano</> : <><CloudUpload className="h-3.5 w-3.5" />Autozapis</>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select value={note.subjectId ?? ''} onChange={(e) => save({ subjectId: e.target.value || null })} className="input w-auto py-1.5 text-xs">
            <option value="">Bez przedmiotu</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => save({ pinned: !note.pinned })} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition', note.pinned ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : 'border-white/10 text-zinc-400 hover:text-white')}>
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}{note.pinned ? 'Odepnij' : 'Przypnij'}
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1">
            <Bot className={cn('h-3.5 w-3.5', note.aiAccess ? 'text-violet-300' : 'text-zinc-500')} />
            <span className="text-xs text-zinc-300">Dostęp AI</span>
            <Toggle checked={note.aiAccess} onChange={(v) => save({ aiAccess: v })} label="Dostęp AI" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={!content.trim()} onClick={() => setExtract(true)} icon={<Sparkles className="h-3.5 w-3.5" />}>Wyciągnij tematy</Button>
            {confirmDel ? (
              <><Button size="sm" variant="danger" onClick={onDelete}>Usuń</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>Nie</Button></>
            ) : <Button size="icon" variant="ghost" onClick={() => setConfirmDel(true)} aria-label="Usuń notatkę"><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>

        <div className={cn('mt-4 rounded-xl border px-3 py-2 text-xs', note.aiAccess ? 'border-violet-400/20 bg-violet-500/[0.06] text-violet-200' : 'border-white/10 bg-white/[0.02] text-zinc-500')}>
          {note.aiAccess
            ? <>✓ AI ma dostęp do <b>treści tekstowej</b> tej notatki.{note.drawing && ' Część odręczna jest zapisana jako obraz – rozpoznawanie pisma (OCR) w przygotowaniu, więc AI jej nie analizuje.'}</>
            : 'Notatka prywatna – AI nie ma do niej dostępu.'}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'text', label: <><Type className="h-3.5 w-3.5" />Tekst</> }, { value: 'draw', label: <><Pencil className="h-3.5 w-3.5" />Odręczne</> }]} />
          {tab === 'text' ? (
            <Segmented value={preview ? 'p' : 'e'} onChange={(v) => setPreview(v === 'p')} options={[{ value: 'e', label: <><Pencil className="h-3.5 w-3.5" />Edycja</> }, { value: 'p', label: <><Eye className="h-3.5 w-3.5" />Podgląd</> }]} />
          ) : (
            <Button size="sm" onClick={saveDrawing} disabled={!drawDirty} icon={<CloudUpload className="h-3.5 w-3.5" />}>Zapisz rysunek</Button>
          )}
        </div>

        <div className="mt-4">
          {tab === 'text' ? (
            preview ? (
              <div onDoubleClick={() => setPreview(false)} className="min-h-[420px] rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                {content.trim() ? <Markdown text={content} className="text-[15px]" /> : <p className="text-sm text-zinc-600">Pusta notatka – kliknij dwukrotnie, by edytować.</p>}
              </div>
            ) : (
              <textarea autoFocus value={content} onChange={(e) => setContent(e.target.value)} rows={18}
                placeholder={'# Nagłówek\n\n- punkt listy\n- **pogrubienie**, _kursywa_, `kod`\n\n1. Lista numerowana'}
                className="w-full resize-y rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 font-mono text-sm leading-relaxed text-zinc-200 outline-none focus:border-violet-400/40" />
            )
          ) : (
            <DrawingCanvas ref={canvas} initial={note.drawing} onChange={() => setDrawDirty(true)} />
          )}
        </div>
      </Card>

      <Modal open={extract} onClose={() => setExtract(false)} wide title="Tematy z notatki" subtitle="AI przeanalizuje treść tekstową notatki i zaproponuje tematy do planu.">
        <Analyzer initialText={content} onResult={setExtracted} compact />
        <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="input sm:w-64">
            {subjects.filter((s) => s.daysLeft >= 0).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button onClick={addExtracted} disabled={!extracted.some((t) => t.selected) || !target}>Dodaj do planu</Button>
        </div>
      </Modal>
    </motion.div>
  );
}
