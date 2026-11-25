import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Bot, Brain, CalendarDays, Eraser, Gauge, HeartHandshake, RefreshCw, Sparkles, Target } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Markdown } from '@/components/Decor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/misc';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/layout/AppLayout';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Msg { id: number; role: 'user' | 'ai'; text: string; suggestions?: string[]; typing?: boolean }

const STORE = 'smartstudy.chat';
const CAPS = [
  { icon: CalendarDays, t: 'Plan dnia', q: 'Co mam dziś?' },
  { icon: Target, t: 'Terminy egzaminów', q: 'Ile dni do egzaminu?' },
  { icon: RefreshCw, t: 'Przeliczanie planu', q: 'Nie zdążyłem – przelicz plan' },
  { icon: Brain, t: 'Powtórki', q: 'Ile mam powtórek?' },
  { icon: Gauge, t: 'Postępy', q: 'Jak mi idzie?' },
  { icon: HeartHandshake, t: 'Motywacja', q: 'Nie chce mi się uczyć…' },
];

export default function Assistant() {
  const { user, handleReport } = useApp();
  const first = user?.name.split(' ')[0];
  const welcome: Msg = { id: 0, role: 'ai', text: `Cześć ${first}! 👋 Jestem asystentem SmartStudy. Znam Twój plan, terminy, postępy i notatki. O co chcesz zapytać?`, suggestions: ['Co mam dziś?', 'Pokaż egzaminy', 'Jak mi idzie?'] };
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { const s = sessionStorage.getItem(STORE); return s ? JSON.parse(s) : [welcome]; } catch { return [welcome]; }
  });
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify(msgs.filter((m) => !m.typing))); } catch { /* ignore */ }
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput('');
    setMsgs((m) => [...m, { id: Date.now(), role: 'user', text: t }]);
    setThinking(true);
    try {
      const [res] = await Promise.all([api.chat(t), new Promise((r) => setTimeout(r, 600 + Math.random() * 500))]);
      if (res.action === 'replanned') handleReport(null, { silent: true });
      setThinking(false);
      const id = Date.now() + 1;
      setMsgs((m) => [...m, { id, role: 'ai', text: '', typing: true }]);
      // efekt strumieniowania odpowiedzi
      const full = res.reply;
      let i = 0;
      await new Promise<void>((resolve) => {
        const step = () => {
          i = Math.min(full.length, i + Math.max(2, Math.round(full.length / 70)));
          setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: full.slice(0, i) } : x)));
          if (i < full.length) setTimeout(step, 16); else resolve();
        };
        step();
      });
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, typing: false, suggestions: res.suggestions } : x)));
    } catch (e) {
      setThinking(false);
      setMsgs((m) => [...m, { id: Date.now(), role: 'ai', text: `⚠️ ${(e as Error).message}` }]);
    }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); send(input); };
  const last = msgs[msgs.length - 1];

  return (
    <div>
      <PageHeader eyebrow={<><Bot className="h-3.5 w-3.5" />Asystent AI</>} title={<>Porozmawiaj ze swoim <span className="text-gradient">planem</span></>}
        actions={<Button variant="ghost" size="sm" onClick={() => setMsgs([welcome])} icon={<Eraser className="h-3.5 w-3.5" />}>Wyczyść rozmowę</Button>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="flex h-[calc(100dvh-240px)] min-h-[520px] flex-col overflow-hidden" spotlight={false}>
          <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
            <AnimatePresence initial={false}>
              {msgs.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                  {m.role === 'ai' ? (
                    <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow"><Sparkles className="h-4 w-4" /></div>
                  ) : user && <Avatar name={user.name} hue={user.avatarHue} />}
                  <div className={cn('max-w-[85%] sm:max-w-[75%]', m.role === 'user' && 'text-right')}>
                    <div className={cn('inline-block rounded-2xl px-4 py-3 text-left', m.role === 'user' ? 'rounded-tr-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,.7)]' : 'rounded-tl-md border border-white/[0.08] bg-white/[0.04]')}>
                      {m.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{m.text}</p> : <Markdown text={m.text} className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0" />}
                      {m.typing && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-violet-300 align-middle" />}
                    </div>
                    {m.suggestions && m === last && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-wrap gap-2">
                        {m.suggestions.map((s) => (
                          <button key={s} onClick={() => send(s)} className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-500/20">{s}</button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
              {thinking && (
                <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white"><Sparkles className="h-4 w-4 animate-pulse" /></div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                    {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-violet-300" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <form onSubmit={submit} className="border-t border-white/[0.06] p-4">
            <div className="relative flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-violet-400/50 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,.1)]">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Zapytaj o plan, egzaminy, postępy…"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-zinc-500" />
              <Button type="submit" size="icon" disabled={!input.trim() || thinking} aria-label="Wyślij"><ArrowUp className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-600">Asystent działa w trybie regułowym na Twoich danych z planu – bez wysyłania ich do zewnętrznych usług.</p>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="label mb-4">Co potrafię</div>
            <div className="space-y-1.5">
              {CAPS.map((c) => (
                <button key={c.t} onClick={() => send(c.q)} className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/[0.04]">
                  <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-violet-300 transition group-hover:border-violet-400/40 group-hover:text-violet-200"><c.icon className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{c.t}</div>
                    <div className="truncate text-[11px] text-zinc-500">„{c.q}”</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
