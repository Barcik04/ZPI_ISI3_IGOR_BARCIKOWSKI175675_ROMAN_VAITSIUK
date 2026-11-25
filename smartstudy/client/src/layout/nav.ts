import {
  BarChart3, Bot, Brain, CalendarDays, LayoutDashboard, Library, PenLine, ScanText, Settings, Timer, Wand2, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  accent?: boolean;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Nauka',
    items: [
      { to: '/app', label: 'Pulpit', icon: LayoutDashboard, hint: 'Przegląd dnia' },
      { to: '/app/plan', label: 'Plan nauki', icon: CalendarDays, hint: 'Kalendarz sesji' },
      { to: '/app/subjects', label: 'Przedmioty', icon: Library, hint: 'Egzaminy i tematy' },
      { to: '/app/reviews', label: 'Powtórki', icon: Brain, hint: 'Spaced repetition' },
      { to: '/app/focus', label: 'Skupienie', icon: Timer, hint: 'Pomodoro' },
    ],
  },
  {
    group: 'AI',
    items: [
      { to: '/app/wizard', label: 'Kreator planu', icon: Wand2, hint: 'Plan w 4 krokach', accent: true },
      { to: '/app/analyze', label: 'Analiza materiałów', icon: ScanText, hint: 'Sylabus → tematy' },
      { to: '/app/assistant', label: 'Asystent', icon: Bot, hint: 'Czat o planie' },
      { to: '/app/notes', label: 'Notatki', icon: PenLine, hint: 'Tekst i rysik' },
    ],
  },
  {
    group: 'Konto',
    items: [
      { to: '/app/stats', label: 'Statystyki', icon: BarChart3, hint: 'Postępy i trendy' },
      { to: '/app/settings', label: 'Ustawienia', icon: Settings, hint: 'Dostępność, plan' },
    ],
  },
];

export const NAV_FLAT = NAV.flatMap((g) => g.items);
