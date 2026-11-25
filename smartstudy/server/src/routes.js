import { Router } from 'express';
import { load, save, uid, hashPassword, verifyPassword, newToken } from './db.js';
import { generatePlan, applySessionDone, DEFAULT_SETTINGS } from './planner.js';
import { analyzeMaterial, assistantReply } from './ai.js';
import { computeStats, buildInsights } from './stats.js';
import { todayISO, diffDays } from './dates.js';

const r = Router();
const db = () => load();

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  plan: u.plan,
  avatarHue: u.avatarHue,
  settings: { ...DEFAULT_SETTINGS, ...u.settings },
  createdAt: u.createdAt,
});

const bad = (res, status, error) => res.status(status).json({ error });

// ───────── Auth ─────────
r.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.includes('@') || (password || '').length < 6)
    return bad(res, 400, 'Podaj imię, poprawny e-mail i hasło (min. 6 znaków).');
  const d = db();
  if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return bad(res, 409, 'Konto z tym adresem już istnieje.');
  const user = {
    id: uid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashPassword(password),
    plan: 'free',
    avatarHue: Math.floor(Math.random() * 360),
    settings: { ...DEFAULT_SETTINGS },
    createdAt: new Date().toISOString(),
  };
  d.users.push(user);
  const token = newToken();
  d.tokens[token] = user.id;
  save();
  res.json({ token, user: publicUser(user) });
});

r.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const d = db();
  const user = d.users.find((u) => u.email === String(email || '').trim().toLowerCase());
  if (!user || !verifyPassword(password || '', user.password)) return bad(res, 401, 'Nieprawidłowy e-mail lub hasło.');
  const token = newToken();
  d.tokens[token] = user.id;
  save();
  res.json({ token, user: publicUser(user) });
});

// ───────── middleware ─────────
r.use((req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const d = db();
  const user = d.users.find((u) => u.id === d.tokens[token]);
  if (!user) return bad(res, 401, 'Sesja wygasła – zaloguj się ponownie.');
  req.user = user;
  req.token = token;
  // Nowy dzień -> automatyczna korekta planu (zaległości z wczoraj).
  if (d.reports[user.id]?.today !== todayISO()) {
    generatePlan(d, user, todayISO());
    save();
  }
  next();
});

const replan = (user) => {
  const report = generatePlan(db(), user, todayISO());
  save();
  return report;
};
const own = (list, id, user) => list.find((x) => x.id === id && x.userId === user.id);
const ownSubject = (id, user) => own(db().subjects, id, user);

r.post('/auth/logout', (req, res) => {
  delete db().tokens[req.token];
  save();
  res.json({ ok: true });
});

r.get('/me', (req, res) => res.json(publicUser(req.user)));
r.patch('/me', (req, res) => {
  const { name, settings, plan } = req.body || {};
  if (name?.trim()) req.user.name = name.trim();
  if (plan && ['free', 'premium'].includes(plan)) req.user.plan = plan;
  let report = null;
  if (settings) {
    req.user.settings = { ...DEFAULT_SETTINGS, ...req.user.settings, ...settings };
    report = replan(req.user);
  }
  save();
  res.json({ user: publicUser(req.user), report });
});

// ───────── Subjects & topics ─────────
const subjectView = (s) => {
  const topics = db()
    .topics.filter((t) => t.subjectId === s.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const est = topics.reduce((a, t) => a + (t.estMinutes || 0), 0);
  const learned = topics.reduce((a, t) => a + Math.min(t.learnedMinutes || 0, t.estMinutes || 0), 0);
  return {
    ...s,
    topics,
    daysLeft: diffDays(todayISO(), s.examDate),
    progress: est ? Math.round((learned / est) * 100) : 0,
    totalMinutes: est,
  };
};

r.get('/subjects', (req, res) => {
  res.json(
    db()
      .subjects.filter((s) => s.userId === req.user.id)
      .sort((a, b) => a.examDate.localeCompare(b.examDate))
      .map(subjectView),
  );
});

const FREE_LIMIT = 3;
r.post('/subjects', (req, res) => {
  const { name, examDate, examType = 'egzamin', color = '#8b5cf6', icon = 'book', difficulty = 3, topics = [] } = req.body || {};
  if (!name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(examDate || '')) return bad(res, 400, 'Podaj nazwę i datę egzaminu.');
  const d = db();
  const count = d.subjects.filter((s) => s.userId === req.user.id).length;
  if (req.user.plan === 'free' && count >= FREE_LIMIT)
    return bad(res, 402, `Plan Free obejmuje ${FREE_LIMIT} przedmioty. Przejdź na Premium, aby dodać więcej.`);
  const subject = { id: uid(), userId: req.user.id, name: name.trim(), examDate, examType, color, icon, difficulty: Number(difficulty) || 3, createdAt: new Date().toISOString() };
  d.subjects.push(subject);
  topics.forEach((t, i) => d.topics.push(makeTopic(subject.id, t, i)));
  const report = replan(req.user);
  res.json({ subject: subjectView(subject), report });
});

r.patch('/subjects/:id', (req, res) => {
  const s = ownSubject(req.params.id, req.user);
  if (!s) return bad(res, 404, 'Nie znaleziono przedmiotu.');
  for (const k of ['name', 'examDate', 'examType', 'color', 'icon', 'difficulty']) if (req.body[k] !== undefined) s[k] = req.body[k];
  const report = replan(req.user);
  res.json({ subject: subjectView(s), report });
});

r.delete('/subjects/:id', (req, res) => {
  const s = ownSubject(req.params.id, req.user);
  if (!s) return bad(res, 404, 'Nie znaleziono przedmiotu.');
  const d = db();
  d.subjects = d.subjects.filter((x) => x.id !== s.id);
  d.topics = d.topics.filter((t) => t.subjectId !== s.id);
  d.sessions = d.sessions.filter((x) => x.subjectId !== s.id);
  const report = replan(req.user);
  res.json({ ok: true, report });
});

function makeTopic(subjectId, t, order) {
  return {
    id: uid(),
    subjectId,
    title: String(t.title || 'Nowy temat').trim(),
    difficulty: Math.max(1, Math.min(5, Number(t.difficulty) || 3)),
    estMinutes: Math.max(10, Math.min(600, Number(t.estMinutes) || 45)),
    learnedMinutes: 0,
    learnedAt: null,
    reviewsDone: 0,
    mastery: 0,
    status: 'new',
    order,
  };
}

r.post('/subjects/:id/topics', (req, res) => {
  const s = ownSubject(req.params.id, req.user);
  if (!s) return bad(res, 404, 'Nie znaleziono przedmiotu.');
  const d = db();
  const list = Array.isArray(req.body) ? req.body : req.body.topics || [req.body];
  const start = d.topics.filter((t) => t.subjectId === s.id).length;
  const created = list.filter((t) => t?.title?.trim()).map((t, i) => makeTopic(s.id, t, start + i));
  d.topics.push(...created);
  const report = replan(req.user);
  res.json({ topics: created, report });
});

const ownTopic = (id, user) => {
  const t = db().topics.find((x) => x.id === id);
  return t && ownSubject(t.subjectId, user) ? t : null;
};

r.patch('/topics/:id', (req, res) => {
  const t = ownTopic(req.params.id, req.user);
  if (!t) return bad(res, 404, 'Nie znaleziono tematu.');
  for (const k of ['title', 'difficulty', 'estMinutes', 'skipped']) if (req.body[k] !== undefined) t[k] = req.body[k];
  if (req.body.mastered) {
    t.status = 'mastered';
    t.mastery = 100;
    t.learnedMinutes = t.estMinutes;
    t.learnedAt ??= todayISO();
    t.reviewsDone = 3;
  }
  const report = replan(req.user);
  res.json({ topic: t, report });
});

r.delete('/topics/:id', (req, res) => {
  const t = ownTopic(req.params.id, req.user);
  if (!t) return bad(res, 404, 'Nie znaleziono tematu.');
  const d = db();
  d.topics = d.topics.filter((x) => x.id !== t.id);
  d.sessions = d.sessions.filter((x) => x.topicId !== t.id || x.status === 'done');
  const report = replan(req.user);
  res.json({ ok: true, report });
});

// ───────── Plan & sessions ─────────
r.get('/sessions', (req, res) => {
  const { from = '0000-00-00', to = '9999-99-99' } = req.query;
  res.json(
    db()
      .sessions.filter((s) => s.userId === req.user.id && s.date >= from && s.date <= to)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
  );
});

r.post('/plan/generate', (req, res) => res.json(replan(req.user)));

// Opcja „ogranicz zakres” z raportu deficytu – pomija wskazane tematy
r.post('/plan/skip-topics', (req, res) => {
  const titles = new Set(req.body?.titles || []);
  const subjectId = req.body?.subjectId;
  const s = ownSubject(subjectId, req.user);
  if (!s) return bad(res, 404, 'Nie znaleziono przedmiotu.');
  let n = 0;
  for (const t of db().topics) if (t.subjectId === s.id && titles.has(t.title)) { t.skipped = true; n++; }
  const report = replan(req.user);
  res.json({ skipped: n, report });
});

// Opcja „więcej czasu” – dodaje minuty do każdego dnia
r.post('/plan/extra-time', (req, res) => {
  const extra = Math.max(5, Math.min(240, Number(req.body?.minutes) || 0));
  const st = { ...DEFAULT_SETTINGS, ...req.user.settings };
  req.user.settings = { ...st, availability: st.availability.map((m) => Math.min(720, m + extra)) };
  const report = replan(req.user);
  res.json({ user: publicUser(req.user), report });
});
r.get('/plan/report', (req, res) => res.json(db().reports[req.user.id] || null));

r.patch('/sessions/:id', (req, res) => {
  const s = own(db().sessions, req.params.id, req.user);
  if (!s) return bad(res, 404, 'Nie znaleziono sesji.');
  const { status, grade } = req.body || {};
  let report = null;
  if (status === 'done' && s.status !== 'done') {
    applySessionDone(db(), s, grade ?? 2);
    save();
  } else if (status === 'missed' && s.status === 'planned') {
    s.status = 'missed';
    // korekta automatyczna (moduł 3)
    if (req.user.settings?.autoReplan !== false) report = replan(req.user);
    save();
  } else if (status === 'planned' && s.status === 'missed') {
    s.status = 'planned';
    save();
  }
  res.json({ session: s, report });
});

r.get('/reviews/due', (req, res) => {
  const today = todayISO();
  const d = db();
  const list = d.sessions
    .filter((s) => s.userId === req.user.id && s.type === 'review' && s.status === 'planned' && s.date <= today)
    .map((s) => {
      const topic = d.topics.find((t) => t.id === s.topicId);
      const subject = d.subjects.find((x) => x.id === s.subjectId);
      const note = d.notes.find((n) => n.userId === req.user.id && n.subjectId === s.subjectId && n.content);
      return { session: s, topic, subject, hint: note ? note.content.slice(0, 260) : null };
    });
  const upcoming = d.sessions.filter((s) => s.userId === req.user.id && s.type === 'review' && s.status === 'planned' && s.date > today).length;
  res.json({ due: list, upcoming });
});

// ───────── Notes ─────────
r.get('/notes', (req, res) => {
  res.json(
    db()
      .notes.filter((n) => n.userId === req.user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
});

const noteFields = ['title', 'content', 'drawing', 'subjectId', 'aiAccess', 'tags', 'pinned', 'color'];
r.post('/notes', (req, res) => {
  const now = new Date().toISOString();
  const note = { id: uid(), userId: req.user.id, title: 'Nowa notatka', content: '', drawing: null, subjectId: null, aiAccess: true, tags: [], pinned: false, color: null, createdAt: now, updatedAt: now };
  for (const k of noteFields) if (req.body?.[k] !== undefined) note[k] = req.body[k];
  db().notes.push(note);
  save();
  res.json(note);
});

r.patch('/notes/:id', (req, res) => {
  const n = own(db().notes, req.params.id, req.user);
  if (!n) return bad(res, 404, 'Nie znaleziono notatki.');
  for (const k of noteFields) if (req.body?.[k] !== undefined) n[k] = req.body[k];
  n.updatedAt = new Date().toISOString();
  save();
  res.json(n);
});

r.delete('/notes/:id', (req, res) => {
  const d = db();
  d.notes = d.notes.filter((n) => !(n.id === req.params.id && n.userId === req.user.id));
  save();
  res.json({ ok: true });
});

// ───────── AI ─────────
r.post('/ai/analyze', (req, res) => {
  const text = String(req.body?.text || '');
  if (text.trim().length < 10) return bad(res, 400, 'Wklej dłuższy fragment sylabusa lub notatek.');
  if (text.length > 60000) return bad(res, 413, 'Dokument jest zbyt długi (limit 60 000 znaków).');
  res.json(analyzeMaterial(text));
});

r.post('/ai/chat', (req, res) => {
  const message = String(req.body?.message || '').slice(0, 2000);
  if (!message.trim()) return bad(res, 400, 'Pusta wiadomość.');
  const out = assistantReply(db(), req.user, message, {
    replan: () => replan(req.user),
    stats: () => computeStats(db(), req.user),
  });
  res.json(out);
});

// ───────── Stats / dashboard ─────────
r.get('/stats', (req, res) => res.json(computeStats(db(), req.user)));

r.get('/dashboard', (req, res) => {
  const d = db();
  const today = todayISO();
  const stats = computeStats(d, req.user);
  const report = d.reports[req.user.id] || null;
  const todaySessions = d.sessions
    .filter((s) => s.userId === req.user.id && s.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  res.json({
    stats,
    report,
    today: todaySessions,
    insights: buildInsights(d, req.user, stats, report),
    notesCount: d.notes.filter((n) => n.userId === req.user.id).length,
  });
});

export default r;
