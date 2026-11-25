import type {
  AnalyzeResult, Dashboard, Note, PlanReport, ReviewItem, Session, Settings, Stats, Subject, Topic, User,
} from './types';

const TOKEN_KEY = 'smartstudy.token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string | null) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`/api${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Brak połączenia z serwerem SmartStudy.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth')) onUnauthorized?.();
    throw new ApiError(res.status, (data as { error?: string }).error || 'Coś poszło nie tak.');
  }
  return data as T;
}

type WithReport<T> = T & { report: PlanReport | null };

export const api = {
  login: (email: string, password: string) => req<{ token: string; user: User }>('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => req<{ token: string; user: User }>('POST', '/auth/register', { name, email, password }),
  logout: () => req('POST', '/auth/logout'),
  demo: () => req<{ email: string; password: string }>('GET', '/demo'),

  me: () => req<User>('GET', '/me'),
  updateMe: (data: Partial<{ name: string; plan: User['plan']; settings: Partial<Settings> }>) => req<WithReport<{ user: User }>>('PATCH', '/me', data),

  dashboard: () => req<Dashboard>('GET', '/dashboard'),
  stats: () => req<Stats>('GET', '/stats'),

  subjects: () => req<Subject[]>('GET', '/subjects'),
  createSubject: (data: Omit<Partial<Subject>, 'topics'> & { topics?: Partial<Topic>[] }) => req<WithReport<{ subject: Subject }>>('POST', '/subjects', data),
  updateSubject: (id: string, data: Partial<Subject>) => req<WithReport<{ subject: Subject }>>('PATCH', `/subjects/${id}`, data),
  deleteSubject: (id: string) => req<WithReport<{ ok: boolean }>>('DELETE', `/subjects/${id}`),
  addTopics: (subjectId: string, topics: Partial<Topic>[]) => req<WithReport<{ topics: Topic[] }>>('POST', `/subjects/${subjectId}/topics`, topics),
  updateTopic: (id: string, data: Partial<Topic> & { mastered?: boolean; skipped?: boolean }) => req<WithReport<{ topic: Topic }>>('PATCH', `/topics/${id}`, data),
  deleteTopic: (id: string) => req<WithReport<{ ok: boolean }>>('DELETE', `/topics/${id}`),

  sessions: (from?: string, to?: string) => req<Session[]>('GET', `/sessions?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}`),
  updateSession: (id: string, status: Session['status'], grade?: number) => req<WithReport<{ session: Session }>>('PATCH', `/sessions/${id}`, { status, grade }),
  generatePlan: () => req<PlanReport>('POST', '/plan/generate'),
  skipTopics: (subjectId: string, titles: string[]) => req<WithReport<{ skipped: number }>>('POST', '/plan/skip-topics', { subjectId, titles }),
  extraTime: (minutes: number) => req<WithReport<{ user: User }>>('POST', '/plan/extra-time', { minutes }),
  report: () => req<PlanReport | null>('GET', '/plan/report'),
  reviewsDue: () => req<{ due: ReviewItem[]; upcoming: number }>('GET', '/reviews/due'),

  notes: () => req<Note[]>('GET', '/notes'),
  createNote: (data: Partial<Note>) => req<Note>('POST', '/notes', data),
  updateNote: (id: string, data: Partial<Note>) => req<Note>('PATCH', `/notes/${id}`, data),
  deleteNote: (id: string) => req<{ ok: boolean }>('DELETE', `/notes/${id}`),

  analyze: (text: string) => req<AnalyzeResult>('POST', '/ai/analyze', { text }),
  chat: (message: string) => req<{ reply: string; suggestions: string[]; action?: string }>('POST', '/ai/chat', { message }),
};
