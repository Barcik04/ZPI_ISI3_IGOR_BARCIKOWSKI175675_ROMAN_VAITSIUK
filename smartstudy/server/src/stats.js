import { addDays, diffDays, todayISO, hhmmToMinutes, weekday } from './dates.js';

export function computeStats(db, user) {
  const today = todayISO();
  const subjects = db.subjects.filter((s) => s.userId === user.id);
  const sessions = db.sessions.filter((s) => s.userId === user.id);
  const topics = db.topics.filter((t) => subjects.some((s) => s.id === t.subjectId));
  const done = sessions.filter((s) => s.status === 'done');
  const missed = sessions.filter((s) => s.status === 'missed');

  // minuty na dzień
  const perDay = {};
  for (const s of done) perDay[s.date] = (perDay[s.date] || 0) + s.minutes;

  // seria dni
  let streak = 0;
  let d = perDay[today] ? today : addDays(today, -1);
  while (perDay[d]) {
    streak++;
    d = addDays(d, -1);
  }
  // najdłuższa seria
  let best = 0;
  let cur = 0;
  const allDays = Object.keys(perDay).sort();
  if (allDays.length) {
    for (let x = allDays[0]; x <= today; x = addDays(x, 1)) {
      cur = perDay[x] ? cur + 1 : 0;
      best = Math.max(best, cur);
    }
  }

  // heatmapa – 18 tygodni, zaczynając od poniedziałku
  const weeks = 18;
  let start = addDays(today, -(weeks * 7 - 1));
  while (weekday(start) !== 1) start = addDays(start, -1);
  const heatmap = [];
  for (let x = start; x <= today; x = addDays(x, 1)) heatmap.push({ date: x, minutes: perDay[x] || 0 });

  // ostatnie 14 dni
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const day = addDays(today, -i);
    const ds = done.filter((s) => s.date === day);
    last14.push({
      date: day,
      learn: ds.filter((s) => s.type === 'learn').reduce((a, s) => a + s.minutes, 0),
      review: ds.filter((s) => s.type !== 'learn').reduce((a, s) => a + s.minutes, 0),
      missed: missed.filter((s) => s.date === day).reduce((a, s) => a + s.minutes, 0),
    });
  }

  // przyszłe 14 dni (obciążenie planu)
  const next14 = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays(today, i);
    const ps = sessions.filter((s) => s.date === day && s.status !== 'missed');
    next14.push({
      date: day,
      learn: ps.filter((s) => s.type === 'learn').reduce((a, s) => a + s.minutes, 0),
      review: ps.filter((s) => s.type !== 'learn').reduce((a, s) => a + s.minutes, 0),
      capacity: (user.settings?.availability || [])[weekday(day)] || 0,
    });
  }

  // przedmioty
  const perSubject = subjects.map((s) => {
    const ts = topics.filter((t) => t.subjectId === s.id);
    const est = ts.reduce((a, t) => a + (t.estMinutes || 0), 0);
    const learned = ts.reduce((a, t) => a + Math.min(t.learnedMinutes || 0, t.estMinutes || 0), 0);
    const mastery = ts.length ? Math.round(ts.reduce((a, t) => a + (t.mastery || 0), 0) / ts.length) : 0;
    const studied = done.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.minutes, 0);
    const planned = sessions.filter((x) => x.subjectId === s.id && x.status === 'planned').reduce((a, x) => a + x.minutes, 0);
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      icon: s.icon,
      examDate: s.examDate,
      daysLeft: diffDays(today, s.examDate),
      topics: ts.length,
      learnedTopics: ts.filter((t) => t.learnedAt).length,
      masteredTopics: ts.filter((t) => t.status === 'mastered').length,
      progress: est ? Math.round((learned / est) * 100) : 0,
      mastery,
      studiedMinutes: studied,
      plannedMinutes: planned,
    };
  });

  // pora dnia
  const timeOfDay = [
    { key: 'Rano', range: [0, 12 * 60], minutes: 0 },
    { key: 'Popołudnie', range: [12 * 60, 17 * 60], minutes: 0 },
    { key: 'Wieczór', range: [17 * 60, 21 * 60], minutes: 0 },
    { key: 'Noc', range: [21 * 60, 24 * 60], minutes: 0 },
  ];
  for (const s of done) {
    const m = hhmmToMinutes(s.startTime);
    const slot = timeOfDay.find((t) => m >= t.range[0] && m < t.range[1]);
    if (slot) slot.minutes += s.minutes;
  }

  // dni tygodnia
  const names = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((w) => ({
    day: names[w],
    minutes: done.filter((s) => weekday(s.date) === w).reduce((a, s) => a + s.minutes, 0),
  }));

  // Model krzywej zapominania (ilustracja, nie pomiar): R = e^(-t/S)
  const retention = [];
  const reviews = [1, 3, 7];
  for (let t = 0; t <= 21; t++) {
    const without = Math.exp(-t / 2.2);
    let S = 2.2;
    let last = 0;
    for (const r of reviews) if (t >= r) { S *= 2.1; last = r; }
    const withR = Math.exp(-(t - last) / S);
    retention.push({ day: t, bez: Math.round(without * 100), smart: Math.round(withR * 100) });
  }

  const totalMinutes = done.reduce((a, s) => a + s.minutes, 0);
  const closed = done.length + missed.length;
  const weekMinutes = last14.slice(7).reduce((a, x) => a + x.learn + x.review, 0);
  const prevWeekMinutes = last14.slice(0, 7).reduce((a, x) => a + x.learn + x.review, 0);

  return {
    today,
    streak,
    bestStreak: best,
    totalMinutes,
    weekMinutes,
    prevWeekMinutes,
    sessionsDone: done.length,
    sessionsMissed: missed.length,
    completionRate: closed ? Math.round((done.length / closed) * 100) : 100,
    totalTopics: topics.length,
    learnedTopics: topics.filter((t) => t.learnedAt).length,
    masteredTopics: topics.filter((t) => t.status === 'mastered').length,
    avgMastery: topics.length ? Math.round(topics.reduce((a, t) => a + (t.mastery || 0), 0) / topics.length) : 0,
    reviewsDone: done.filter((s) => s.type === 'review').length,
    heatmap,
    last14,
    next14,
    perSubject,
    timeOfDay: timeOfDay.map(({ key, minutes }) => ({ key, minutes })),
    byWeekday,
    retention,
  };
}

export function buildInsights(db, user, stats, report) {
  const out = [];
  const today = stats.today;
  const best = [...stats.timeOfDay].sort((a, b) => b.minutes - a.minutes)[0];
  if (best?.minutes) out.push({ type: 'tip', icon: 'sparkles', text: `Najwięcej uczysz się w porze: **${best.key.toLowerCase()}**. Tam układam najtrudniejsze tematy.` });
  const soon = stats.perSubject.filter((s) => s.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)[0];
  if (soon) out.push({ type: soon.daysLeft <= 5 ? 'warn' : 'info', icon: 'calendar', text: `**${soon.name}** za ${soon.daysLeft} ${soon.daysLeft === 1 ? 'dzień' : 'dni'} – materiał opanowany w ${soon.progress}%.` });
  if (report && !report.feasible) {
    const d = report.deficits[0];
    out.push({ type: 'danger', icon: 'alert', text: `Plan dla **${d.subject}** się nie domyka (brakuje ${d.deficitMinutes} min). Zwiększ czas o ${d.suggestions.extraPerDay} min/dzień lub ogranicz zakres.` });
  }
  const due = db.sessions.filter((s) => s.userId === user.id && s.type === 'review' && s.status === 'planned' && s.date <= today).length;
  if (due) out.push({ type: 'info', icon: 'brain', text: `Czeka **${due}** ${due === 1 ? 'powtórka' : due < 5 ? 'powtórki' : 'powtórek'} – zrób je, zanim krzywa zapominania zrobi swoje.` });
  if (stats.weekMinutes > stats.prevWeekMinutes && stats.prevWeekMinutes > 0) {
    const p = Math.round(((stats.weekMinutes - stats.prevWeekMinutes) / stats.prevWeekMinutes) * 100);
    out.push({ type: 'success', icon: 'trending', text: `W tym tygodniu uczysz się o **${p}%** więcej niż w poprzednim. 🚀` });
  }
  if (stats.streak >= 3) out.push({ type: 'success', icon: 'flame', text: `Seria **${stats.streak} dni**! Nie przerywaj jej dzisiaj.` });
  return out.slice(0, 4);
}
