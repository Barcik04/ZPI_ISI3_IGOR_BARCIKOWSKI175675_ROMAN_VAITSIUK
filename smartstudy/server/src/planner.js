// Moduły 1, 3 i 4 SmartStudy:
//  1 – generowanie planu (trudność + czas + termin),
//  3 – automatyczna korekta (opuszczone sesje -> przeliczenie, wykrywanie deficytu),
//  4 – powtórki rozłożone w czasie (1, 3, 7 dni; nigdy po egzaminie).
import { addDays, diffDays, weekday, minutesToHHMM, hhmmToMinutes } from './dates.js';
import { uid } from './db.js';

export const REVIEW_OFFSETS = [1, 3, 7];
const REVIEW_MIN = 20;
const FINAL_MIN = 45;
const MIN_CHUNK = 25;
const BREAK_MIN = 10;
const START = { morning: 8 * 60, afternoon: 14 * 60, evening: 18 * 60 };

export const DEFAULT_SETTINGS = {
  availability: [90, 120, 120, 120, 120, 120, 180], // nd, pn, wt, śr, cz, pt, sb (minuty)
  preferredTime: 'evening',
  sessionLength: 50,
  autoReplan: true,
  notifications: true,
};

const round5 = (n) => Math.ceil(n / 5) * 5;

export function generatePlan(db, user, today) {
  const settings = { ...DEFAULT_SETTINGS, ...(user.settings || {}) };
  const sessionLength = Math.max(MIN_CHUNK, settings.sessionLength || 50);
  const subjects = db.subjects.filter((s) => s.userId === user.id);
  const subjMap = new Map(subjects.map((s) => [s.id, s]));
  const topics = db.topics.filter((t) => subjMap.has(t.subjectId));

  // Korekta: zaplanowane sesje z przeszłości stają się opuszczone.
  let autoMissed = 0;
  for (const s of db.sessions) {
    if (s.userId === user.id && s.status === 'planned' && s.date < today) {
      s.status = 'missed';
      autoMissed++;
    }
  }
  // Przyszłe, niewykonane sesje generujemy od nowa.
  db.sessions = db.sessions.filter(
    (s) => !(s.userId === user.id && s.status === 'planned' && s.date >= today),
  );

  const active = subjects.filter((s) => s.examDate > today);
  const report = {
    generatedAt: new Date().toISOString(),
    today,
    totalSessions: 0,
    learnMinutes: 0,
    reviewMinutes: 0,
    feasible: true,
    deficits: [],
    droppedReviews: 0,
    autoMissed,
    days: 0,
  };
  if (!active.length) {
    db.reports[user.id] = report;
    return report;
  }

  const lastDay = addDays(active.map((s) => s.examDate).sort().at(-1), -1);
  const days = [];
  for (let d = today; d <= lastDay; d = addDays(d, 1)) days.push(d);
  report.days = days.length;

  const doneToday = db.sessions
    .filter((s) => s.userId === user.id && s.date === today && s.status === 'done')
    .reduce((a, s) => a + s.minutes, 0);
  const capacity = {};
  for (const d of days) {
    const base = settings.availability[weekday(d)] ?? 0;
    capacity[d] = Math.max(0, base - (d === today ? doneToday : 0));
  }

  // Kolejki nauki (podział tematów na sesje o długości <= sessionLength)
  const queues = new Map();
  for (const s of active) {
    const q = [];
    const ts = topics
      .filter((t) => t.subjectId === s.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const t of ts) {
      if (t.skipped) continue;
      let remaining = Math.max(0, (t.estMinutes || 45) - (t.learnedMinutes || 0));
      let part = 1;
      const parts = Math.ceil(remaining / sessionLength);
      while (remaining > 0) {
        const m = Math.min(sessionLength, remaining);
        remaining -= m;
        q.push({ topic: t, minutes: m, part, parts });
        part++;
      }
    }
    queues.set(s.id, q);
  }

  // Powtórki tematów już opanowanych wcześniej
  const reviews = [];
  for (const t of topics) {
    const s = subjMap.get(t.subjectId);
    if (!t.learnedAt || t.skipped || !active.includes(s)) continue;
    let prev = null;
    for (let i = t.reviewsDone || 0; i < REVIEW_OFFSETS.length; i++) {
      let due = addDays(t.learnedAt, REVIEW_OFFSETS[i]);
      if (due < today) due = today;
      if (prev && due <= prev) due = addDays(prev, REVIEW_OFFSETS[i] - REVIEW_OFFSETS[i - 1]);
      reviews.push({ topic: t, subject: s, due, idx: i });
      prev = due;
    }
  }

  const placed = [];
  const place = (day, o) => placed.push({ date: day, ...o });

  for (const day of days) {
    let cap = capacity[day];

    // 1) powtórka generalna dzień przed egzaminem
    for (const s of active) {
      if (addDays(s.examDate, -1) === day && cap >= FINAL_MIN) {
        place(day, { subjectId: s.id, topicId: null, minutes: FINAL_MIN, type: 'final', title: `Powtórka generalna – ${s.name}` });
        cap -= FINAL_MIN;
      }
    }

    // 2) zaległe i bieżące powtórki
    reviews.sort((a, b) => (a.due < b.due ? -1 : 1));
    for (const r of reviews) {
      if (r.done || r.due > day) continue;
      if (r.subject.examDate <= day) {
        r.done = true;
        report.droppedReviews++;
        continue;
      }
      if (cap >= REVIEW_MIN) {
        place(day, {
          subjectId: r.subject.id,
          topicId: r.topic.id,
          minutes: REVIEW_MIN,
          type: 'review',
          reviewIndex: r.idx,
          title: `Powtórka ${r.idx + 1}/3 · ${r.topic.title}`,
        });
        cap -= REVIEW_MIN;
        r.done = true;
      }
    }

    // 3) nowy materiał – przeplatanie przedmiotów wg pilności
    while (cap >= MIN_CHUNK) {
      let best = null;
      let bestScore = -Infinity;
      for (const s of active) {
        const q = queues.get(s.id);
        if (!q.length) continue;
        const deadline = addDays(s.examDate, -1);
        if (deadline < day) continue;
        const daysLeft = diffDays(day, deadline) + 1;
        const remaining = q.reduce((a, c) => a + c.minutes, 0);
        const score = remaining / daysLeft + (s.difficulty || 3) * 2 + (q[0].topic.difficulty || 3);
        if (score > bestScore) {
          best = s;
          bestScore = score;
        }
      }
      if (!best) break;
      const q = queues.get(best.id);
      const chunk = q[0];
      const m = Math.min(chunk.minutes, cap);
      const finishesTopic = m === chunk.minutes && (q.length === 1 || q[1].topic.id !== chunk.topic.id);
      if (m === chunk.minutes) q.shift();
      else chunk.minutes -= m;
      place(day, {
        subjectId: best.id,
        topicId: chunk.topic.id,
        minutes: m,
        type: 'learn',
        title: chunk.parts > 1 ? `${chunk.topic.title} (cz. ${chunk.part}/${chunk.parts})` : chunk.topic.title,
      });
      cap -= m;
      if (finishesTopic) {
        let prev = null;
        REVIEW_OFFSETS.forEach((off, idx) => {
          let due = addDays(day, off);
          if (prev && due <= prev) due = addDays(prev, 1);
          reviews.push({ topic: chunk.topic, subject: best, due, idx });
          prev = due;
        });
      }
    }
  }

  // niewykorzystane powtórki (po egzaminie / brak czasu)
  for (const r of reviews) if (!r.done) report.droppedReviews++;

  // Deficyty
  for (const s of active) {
    const q = queues.get(s.id);
    if (!q.length) continue;
    const deficitMinutes = q.reduce((a, c) => a + c.minutes, 0);
    const daysAvail = Math.max(1, diffDays(today, s.examDate));
    const remainingTopics = topics
      .filter((t) => t.subjectId === s.id && !t.skipped && (t.learnedMinutes || 0) < (t.estMinutes || 45))
      .sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
    const drop = [];
    let acc = 0;
    for (const t of remainingTopics) {
      if (acc >= deficitMinutes) break;
      drop.push(t.title);
      acc += (t.estMinutes || 45) - (t.learnedMinutes || 0);
    }
    report.deficits.push({
      subjectId: s.id,
      subject: s.name,
      color: s.color,
      examDate: s.examDate,
      deficitMinutes,
      unscheduledTopics: [...new Set(q.map((c) => c.topic.title))],
      suggestions: {
        extraPerDay: round5(deficitMinutes / daysAvail),
        dropTopics: drop,
      },
    });
  }
  report.feasible = report.deficits.length === 0;

  // Godziny rozpoczęcia
  const order = { final: 0, review: 1, learn: 2 };
  const byDay = new Map();
  for (const p of placed) {
    if (!byDay.has(p.date)) byDay.set(p.date, []);
    byDay.get(p.date).push(p);
  }
  for (const [date, list] of byDay) {
    list.sort((a, b) => order[a.type] - order[b.type]);
    let t = START[settings.preferredTime] ?? START.evening;
    if (date === today) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin > t) t = Math.min(Math.ceil((nowMin + 5) / 15) * 15, 23 * 60);
      // nie nakładaj się na sesje już zrobione / opuszczone dzisiaj
      for (const s of db.sessions) {
        if (s.userId === user.id && s.date === today && s.status !== 'planned' && s.startTime) {
          t = Math.max(t, hhmmToMinutes(s.startTime) + s.minutes + BREAK_MIN);
        }
      }
    }
    for (const p of list) {
      p.startTime = minutesToHHMM(t);
      t += p.minutes + BREAK_MIN;
      db.sessions.push({
        id: uid(),
        userId: user.id,
        status: 'planned',
        reviewIndex: null,
        ...p,
      });
      report.totalSessions++;
      if (p.type === 'learn') report.learnMinutes += p.minutes;
      else report.reviewMinutes += p.minutes;
    }
  }

  db.reports[user.id] = report;
  return report;
}

/** Zastosowanie wykonania sesji do stanu tematu */
export function applySessionDone(db, session, grade = 2) {
  const topic = db.topics.find((t) => t.id === session.topicId);
  session.status = 'done';
  session.completedAt = new Date().toISOString();
  if (!topic) return;
  if (session.type === 'learn') {
    topic.learnedMinutes = (topic.learnedMinutes || 0) + session.minutes;
    if (topic.learnedMinutes >= (topic.estMinutes || 45) && !topic.learnedAt) {
      topic.learnedAt = session.date;
      topic.status = 'learning';
      topic.mastery = Math.max(topic.mastery || 0, 45);
    } else {
      topic.mastery = Math.max(topic.mastery || 0, Math.round(40 * (topic.learnedMinutes / (topic.estMinutes || 45))));
    }
  } else if (session.type === 'review') {
    const delta = [-8, 6, 15, 22][grade] ?? 15;
    session.grade = grade;
    topic.reviewsDone = Math.max(topic.reviewsDone || 0, (session.reviewIndex ?? 0) + 1);
    topic.mastery = Math.max(0, Math.min(100, (topic.mastery || 45) + delta));
    topic.status = topic.mastery >= 85 ? 'mastered' : 'learning';
  }
}
