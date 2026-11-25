import { Eraser, Highlighter, PenTool, Redo2, Trash2, Undo2 } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Tool = 'pen' | 'marker' | 'eraser';
interface Point { x: number; y: number; p: number }
interface Stroke { tool: Tool; color: string; size: number; points: Point[] }

export interface DrawingHandle { toDataURL: () => string | null; isEmpty: () => boolean }

const COLORS = ['#f4f4f5', '#a78bfa', '#22d3ee', '#f472b6', '#facc15', '#34d399', '#fb7185'];
const W = 1600;
const H = 1000;

/** Płótno do notatek odręcznych – obsługuje nacisk rysika (Pointer Events). */
export const DrawingCanvas = forwardRef<DrawingHandle, { initial?: string | null; onChange?: () => void }>(function DrawingCanvas({ initial, onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(4);
  const [pressureSeen, setPressureSeen] = useState(false);
  const current = useRef<Stroke | null>(null);
  const bg = useRef<HTMLImageElement | null>(null);

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.globalAlpha = s.tool === 'marker' ? 0.35 : 1;
    ctx.strokeStyle = s.color;
    if (s.tool === 'pen') { ctx.shadowColor = s.color; ctx.shadowBlur = 2; }
    const pts = s.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.fillStyle = s.color;
      ctx.arc(pts[0].x, pts[0].y, (s.size * (0.5 + pts[0].p)) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const w = s.tool === 'pen' ? s.size * (0.35 + b.p * 1.3) : s.tool === 'marker' ? s.size * 4 : s.size * 5;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.quadraticCurveTo(a.x, a.y, mx, my);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const redraw = useCallback((list: Stroke[]) => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (bg.current) ctx.drawImage(bg.current, 0, 0, W, H);
    for (const s of list) drawStroke(ctx, s);
  }, []);

  useEffect(() => {
    setStrokes([]);
    setRedo([]);
    bg.current = null;
    if (initial) {
      const img = new Image();
      img.onload = () => { bg.current = img; redraw([]); };
      img.src = initial;
    } else redraw([]);
  }, [initial, redraw]);

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvas.current?.toDataURL('image/png') ?? null,
    isEmpty: () => !strokes.length && !bg.current,
  }), [strokes]);

  const pos = (e: React.PointerEvent): Point => {
    const r = canvas.current!.getBoundingClientRect();
    let p = e.pressure;
    if (e.pointerType === 'pen' && p > 0) { if (!pressureSeen) setPressureSeen(true); } else p = 0.5;
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, p };
  };

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    current.current = { tool, color, size, points: [pos(e)] };
  };
  const move = (e: React.PointerEvent) => {
    if (!current.current) return;
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events) current.current.points.push(pos({ ...e, clientX: ev.clientX, clientY: ev.clientY, pressure: ev.pressure, pointerType: e.pointerType } as React.PointerEvent));
    const ctx = canvas.current?.getContext('2d');
    if (ctx) { const s = current.current; drawStroke(ctx, { ...s, points: s.points.slice(-events.length - 1) }); }
  };
  const up = () => {
    if (!current.current) return;
    const s = current.current;
    current.current = null;
    const next = [...strokes, s];
    setStrokes(next);
    setRedo([]);
    redraw(next);
    onChange?.();
  };

  const undo = () => { if (!strokes.length) return; const next = strokes.slice(0, -1); setRedo([...redo, strokes.at(-1)!]); setStrokes(next); redraw(next); onChange?.(); };
  const redoFn = () => { if (!redo.length) return; const next = [...strokes, redo.at(-1)!]; setRedo(redo.slice(0, -1)); setStrokes(next); redraw(next); onChange?.(); };
  const clear = () => { bg.current = null; setStrokes([]); setRedo([]); redraw([]); onChange?.(); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redoFn() : undo(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const tools: { t: Tool; icon: typeof PenTool; l: string }[] = [
    { t: 'pen', icon: PenTool, l: 'Pióro' }, { t: 'marker', icon: Highlighter, l: 'Zakreślacz' }, { t: 'eraser', icon: Eraser, l: 'Gumka' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2">
        <div className="flex gap-1">
          {tools.map((x) => (
            <button key={x.t} title={x.l} onClick={() => setTool(x.t)} className={cn('grid h-9 w-9 place-items-center rounded-xl transition', tool === x.t ? 'bg-violet-500/25 text-violet-100 shadow-[inset_0_0_0_1px_rgba(167,139,250,.4)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white')}>
              <x.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }} className={cn('h-6 w-6 rounded-full transition', color === c && tool !== 'eraser' ? 'scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-ink-900' : 'hover:scale-110')} style={{ background: c }} aria-label={`Kolor ${c}`} />
          ))}
        </div>
        <div className="h-6 w-px bg-white/10" />
        <input type="range" min={1} max={12} value={size} onChange={(e) => setSize(Number(e.target.value))} className="range w-24" aria-label="Grubość" />
        <div className="ml-auto flex gap-1">
          <button onClick={undo} disabled={!strokes.length} title="Cofnij (Ctrl+Z)" className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redoFn} disabled={!redo.length} title="Ponów" className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
          <button onClick={clear} title="Wyczyść" className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition hover:bg-rose-500/15 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b14]">
        <div className="dot-bg pointer-events-none absolute inset-0 opacity-60" />
        <canvas ref={canvas} width={W} height={H} className="relative block aspect-[16/10] w-full touch-none" style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => e.buttons === 0 && up()} />
        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-zinc-600">{pressureSeen ? '✎ wykryto nacisk rysika' : 'mysz / dotyk / rysik'}</div>
      </div>
    </div>
  );
});
