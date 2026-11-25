export type Plan = 'free' | 'premium';

export interface Settings {
  availability: number[]; // 0 = niedziela
  preferredTime: 'morning' | 'afternoon' | 'evening';
  sessionLength: number;
  autoReplan: boolean;
  notifications: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  avatarHue: number;
  settings: Settings;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  difficulty: number;
  estMinutes: number;
  learnedMinutes: number;
  learnedAt: string | null;
  reviewsDone: number;
  mastery: number;
  status: 'new' | 'learning' | 'mastered';
  order: number;
  skipped?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  examDate: string;
  examType: string;
  color: string;
  icon: string;
  difficulty: number;
  topics: Topic[];
  daysLeft: number;
  progress: number;
  totalMinutes: number;
}

export type SessionType = 'learn' | 'review' | 'final';
export type SessionStatus = 'planned' | 'done' | 'missed';

export interface Session {
  id: string;
  subjectId: string;
  topicId: string | null;
  date: string;
  startTime: string;
  minutes: number;
  type: SessionType;
  status: SessionStatus;
  title: string;
  reviewIndex: number | null;
  grade?: number;
}

export interface Deficit {
  subjectId: string;
  subject: string;
  color: string;
  examDate: string;
  deficitMinutes: number;
  unscheduledTopics: string[];
  suggestions: { extraPerDay: number; dropTopics: string[] };
}

export interface PlanReport {
  generatedAt: string;
  today: string;
  totalSessions: number;
  learnMinutes: number;
  reviewMinutes: number;
  feasible: boolean;
  deficits: Deficit[];
  droppedReviews: number;
  autoMissed: number;
  days: number;
}

export interface SubjectStat {
  id: string;
  name: string;
  color: string;
  icon: string;
  examDate: string;
  daysLeft: number;
  topics: number;
  learnedTopics: number;
  masteredTopics: number;
  progress: number;
  mastery: number;
  studiedMinutes: number;
  plannedMinutes: number;
}

export interface Stats {
  today: string;
  streak: number;
  bestStreak: number;
  totalMinutes: number;
  weekMinutes: number;
  prevWeekMinutes: number;
  sessionsDone: number;
  sessionsMissed: number;
  completionRate: number;
  totalTopics: number;
  learnedTopics: number;
  masteredTopics: number;
  avgMastery: number;
  reviewsDone: number;
  heatmap: { date: string; minutes: number }[];
  last14: { date: string; learn: number; review: number; missed: number }[];
  next14: { date: string; learn: number; review: number; capacity: number }[];
  perSubject: SubjectStat[];
  timeOfDay: { key: string; minutes: number }[];
  byWeekday: { day: string; minutes: number }[];
  retention: { day: number; bez: number; smart: number }[];
}

export interface Insight {
  type: 'tip' | 'info' | 'warn' | 'danger' | 'success';
  icon: string;
  text: string;
}

export interface Dashboard {
  stats: Stats;
  report: PlanReport | null;
  today: Session[];
  insights: Insight[];
  notesCount: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  drawing: string | null;
  subjectId: string | null;
  aiAccess: boolean;
  tags: string[];
  pinned: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzedTopic {
  title: string;
  difficulty: number;
  estMinutes: number;
  confidence: number;
  keywords: string[];
}

export interface AnalyzeResult {
  topics: AnalyzedTopic[];
  stats: { lines: number; detected: number; totalMinutes: number; avgDifficulty: number; processingMs: number; engine: string };
}

export interface ReviewItem {
  session: Session;
  topic: Topic;
  subject: Subject;
  hint: string | null;
}
