import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock3, Cpu, FileText, Gauge, Plus, ScanText, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { AnimatedNumber, DifficultyDots } from '@/components/ui/misc';
import { api } from '@/lib/api';
import type { AnalyzeResult, AnalyzedTopic } from '@/lib/types';
import { cn, minutes } from '@/lib/utils';

export const SAMPLE_SYLLABUS = `SYLABUS – Algorytmy i struktury danych
Kod przedmiotu: 11.3-WI-INFP-ASD
Punkty ECTS: 6
Forma zaliczenia: egzamin pisemny

Treści programowe:
W1. Wprowadzenie – pojęcie algorytmu, poprawność i złożoność obliczeniowa
W2. Notacja asymptotyczna O, Ω, Θ
W3. Rekurencja i metoda „dziel i zwyciężaj”
W4. Algorytmy sortowania: QuickSort, MergeSort, HeapSort
W5. Struktury liniowe – stos, kolejka, lista
W6. Drzewa BST i drzewa zrównoważone AVL
W7. Tablice mieszające i funkcje haszujące
W8. Grafy – reprezentacje, przeszukiwanie BFS i DFS
W9. Najkrótsze ścieżki – algorytm Dijkstry i Bellmana-Forda
W10. Minimalne drzewo rozpinające – Kruskal i Prim
W11. Programowanie dynamiczne
W12. Problemy NP-zupełne – podstawy teorii złożoności

Literatura: T. Cormen, Wprowadzenie do algorytmów`;

const STAGES = ['Odczyt dokumentu', 'Wykrywanie struktury i nagłówków', 'Ekstrakcja tematów', 'Szacowanie trudności', 'Estymacja czasu nauki'];

export type EditableTopic = AnalyzedTopic & { selected: boolean; id: string };

export function Analyzer({ onResult, accent = '#8b5cf6', compact, initialText = '' }: { onResult: (topics: EditableTopic[]) => void; accent?: string; compact?: boolean; initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [topics, setTopics] = useState<EditableTopic[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const running = stage >= 0 && stage < STAGES.length;

  const update = (next: EditableTopic[]) => { setTopics(next); onResult(next); };

  const run = async () => {
    if (text.trim().length < 10) return toast.error('Wklej dłuższy fragment sylabusa lub notatek.');
    setResult(null);
    update([]);
    setStage(0);
    const req = api.analyze(text);
    for (let i = 1; i <= STAGES.length; i++) {
      await new Promise((r) => setTimeout(r, 380 + Math.random() * 220));
      setStage(i);
    }
    try {
      const r = await req;
      setResult(r);
      update(r.topics.map((t, i) => ({ ...t, selected: true, id: `${i}-${t.title}` })));
      if (!r.topics.length) toast.warning('Nie rozpoznano tematów – spróbuj tekstu z listą zagadnień.');
    } catch (e) {
      toast.error((e as Error).message);
      setStage(-1);
    }
  };

  const onFile = (f?: File) => {
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name)) return toast.info('W wersji demo obsługujemy pliki .txt i .md – z PDF/DOCX skopiuj i wklej tekst.');
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result));
    reader.readAsText(f, 'utf-8');
  };

  const selected = topics.filter((t) => t.selected);
  const total = selected.reduce((a, t) => a + t.estMinutes, 0);

  return (
    <div className={cn('grid gap-6', !compact && 'xl:grid-cols-[1fr_1.1fr]')}>
      {/* wejście */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Materiał źródłowy</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setText(SAMPLE_SYLLABUS)} icon={<FileText className="h-3.5 w-3.5" />}>Przykład</Button>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} icon={<Upload className="h-3.5 w-3.5" />}>Plik</Button>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60 focus-within:border-violet-400/50"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={compact ? 10 : 16} placeholder={'Wklej sylabus, spis treści lub notatki…\n\nnp.\nW1. Granice funkcji\nW2. Pochodne cząstkowe\n…'}
            className="block w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600" />
          <AnimatePresence>
            {running && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 bg-ink-950/40">
                <div className="absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" style={{ boxShadow: '0 0 40px rgba(34,211,238,.3)' }}>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
                </div>
                <div className="dot-bg absolute inset-0 opacity-40" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 text-[11px] text-zinc-500">
            <span>{text.length.toLocaleString('pl-PL')} znaków · {text.split('\n').filter((l) => l.trim()).length} linii</span>
            <span>przeciągnij plik .txt</span>
          </div>
        </div>
        <Button className="mt-4 w-full" size="lg" onClick={run} loading={running} icon={<Wand2 className="h-4 w-4" />}>{running ? 'AI analizuje…' : 'Analizuj materiał'}</Button>
      </div>

      {/* wynik */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {running ? (
            <motion.div key="stages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="relative grid h-12 w-12 place-items-center">
                  <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-violet-400/50" />
                  <Cpu className="h-5 w-5 text-violet-300" />
                </div>
                <div><div className="font-semibold text-white">Silnik AI pracuje</div><div className="text-xs text-zinc-500">Analiza strukturalna i semantyczna</div></div>
              </div>
              {STAGES.map((s, i) => (
                <div key={s} className={cn('flex items-center gap-3 text-sm transition', i < stage ? 'text-zinc-300' : i === stage ? 'text-white' : 'text-zinc-600')}>
                  <span className={cn('grid h-6 w-6 place-items-center rounded-full border text-[10px]', i < stage ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : i === stage ? 'border-violet-400/60 text-violet-200' : 'border-white/10')}>
                    {i < stage ? <Check className="h-3.5 w-3.5" /> : i === stage ? <span className="h-2 w-2 animate-ping rounded-full bg-violet-400" /> : i + 1}
                  </span>
                  {s}
                </div>
              ))}
            </motion.div>
          ) : result ? (
            <motion.div key="res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <Stat icon={<ScanText className="h-3.5 w-3.5" />} l="Wykryte tematy" v={<AnimatedNumber value={result.stats.detected} />} />
                <Stat icon={<Clock3 className="h-3.5 w-3.5" />} l="Szacowany czas" v={minutes(total)} />
                <Stat icon={<Gauge className="h-3.5 w-3.5" />} l="Śr. trudność" v={<><AnimatedNumber value={result.stats.avgDifficulty} decimals={1} /> / 5</>} />
              </div>
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Zaznaczone: {selected.length}/{topics.length} · zatwierdź przed zbudowaniem planu</span>
                <button className="hover:text-white" onClick={() => update(topics.map((t) => ({ ...t, selected: selected.length !== topics.length })))}>{selected.length === topics.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}</button>
              </div>
              <div className={cn('space-y-1.5 overflow-y-auto pr-1', compact ? 'max-h-[340px]' : 'max-h-[460px]')}>
                {topics.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                    className={cn('group flex items-center gap-3 rounded-xl border p-2.5 transition', t.selected ? 'border-white/[0.08] bg-white/[0.03]' : 'border-transparent bg-transparent opacity-50')}>
                    <button onClick={() => update(topics.map((x) => (x.id === t.id ? { ...x, selected: !x.selected } : x)))}
                      className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition', t.selected ? 'border-transparent text-white' : 'border-white/20')} style={t.selected ? { background: accent } : undefined}>
                      {t.selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <input value={t.title} onChange={(e) => update(topics.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)))} className="w-full truncate bg-transparent text-sm text-zinc-100 outline-none" />
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${t.confidence * 100}%` }} /></div>
                        <span className="whitespace-nowrap font-mono text-[10px] text-zinc-500">{Math.round(t.confidence * 100)}% pewności</span>
                        {t.keywords.slice(0, 2).map((k) => <span key={k} className="hidden rounded bg-white/5 px-1.5 text-[10px] text-zinc-500 md:inline">{k}</span>)}
                      </div>
                    </div>
                    <DifficultyDots value={t.difficulty} color={accent} onChange={(v) => update(topics.map((x) => (x.id === t.id ? { ...x, difficulty: v } : x)))} />
                    <span className="w-14 text-right font-mono text-[11px] text-zinc-400">{t.estMinutes}′</span>
                    <button onClick={() => update(topics.filter((x) => x.id !== t.id))} className="text-zinc-600 opacity-0 transition hover:text-rose-300 group-hover:opacity-100" aria-label="Usuń"><Trash2 className="h-3.5 w-3.5" /></button>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => update([...topics, { title: 'Nowy temat', difficulty: 3, estMinutes: 45, confidence: 1, keywords: [], selected: true, id: `m${Date.now()}` }])}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-xs text-zinc-500 transition hover:border-violet-400/40 hover:text-violet-200">
                <Plus className="h-3.5 w-3.5" /> Dodaj temat ręcznie
              </button>
              <p className="mt-3 text-[11px] text-zinc-600">{result.stats.engine} · {result.stats.processingMs} ms · {result.stats.lines} linii</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-500/20 blur-2xl" />
                <Sparkles className="relative h-10 w-10 text-cyan-300" />
              </div>
              <div className="font-semibold text-white">Tu pojawią się tematy</div>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">AI rozpozna zagadnienia, oceni ich trudność (1–5) i oszacuje czas nauki. Każdy wynik możesz poprawić.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ icon, l, v }: { icon: ReactNode; l: string; v: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">{icon}{l}</div>
      <div className="mt-0.5 font-display text-lg font-semibold text-white">{v}</div>
    </div>
  );
}
