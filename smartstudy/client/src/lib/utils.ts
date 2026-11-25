import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import confetti from 'canvas-confetti';

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const addDaysISO = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const fmt = (iso: string, f: string) => format(parseISO(iso), f, { locale: pl });

export const minutes = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};
export const hoursShort = (m: number) => (m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0).replace('.', ',')} h` : `${m} min`);

export const plural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few;
  return many;
};

export const daysLabel = (n: number) => (n === 0 ? 'dziś' : n === 1 ? 'jutro' : n < 0 ? `${-n} dni temu` : `za ${n} ${plural(n, 'dzień', 'dni', 'dni')}`);

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Nocna zmiana';
  if (h < 12) return 'Dzień dobry';
  if (h < 18) return 'Miłego popołudnia';
  return 'Dobry wieczór';
};

export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const SUBJECT_COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#a3e635', '#e879f9', '#fb923c'];

export function celebrate(power = 1) {
  const colors = ['#a78bfa', '#22d3ee', '#f472b6', '#facc15'];
  confetti({ particleCount: Math.round(90 * power), spread: 75, origin: { y: 0.7 }, colors, scalar: 0.9, disableForReducedMotion: true });
  if (power > 1) {
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true }), 180);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true }), 300);
  }
}

export const sessionTypeLabel = { learn: 'Nauka', review: 'Powtórka', final: 'Powtórka generalna' } as const;
