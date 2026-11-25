// Dane demonstracyjne – syntetyczne konto studenta (bez rzeczywistych danych osobowych).
import { fileURLToPath } from 'node:url';
import { load, reset, flush, uid, hashPassword } from './db.js';
import { addDays, todayISO } from './dates.js';
import { generatePlan, applySessionDone, DEFAULT_SETTINGS, REVIEW_OFFSETS } from './planner.js';

export const DEMO = { email: 'demo@smartstudy.pl', password: 'demo123' };

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUBJECTS = [
  {
    name: 'Analiza matematyczna II', exam: 6, color: '#8b5cf6', icon: 'sigma', difficulty: 5, examType: 'egzamin', learned: 5,
    topics: [
      ['Granice i ciągłość funkcji wielu zmiennych', 4, 50], ['Pochodne cząstkowe i różniczka zupełna', 4, 55],
      ['Ekstrema lokalne funkcji wielu zmiennych', 4, 60], ['Ekstrema warunkowe – mnożniki Lagrange’a', 5, 70],
      ['Całki podwójne', 4, 60], ['Zamiana zmiennych – współrzędne biegunowe', 5, 65], ['Całki potrójne', 5, 70],
      ['Całki krzywoliniowe', 5, 70], ['Twierdzenie Greena', 4, 50], ['Szeregi liczbowe – kryteria zbieżności', 3, 45],
    ],
  },
  {
    name: 'Bazy danych', exam: 11, color: '#22d3ee', icon: 'database', difficulty: 3, examType: 'egzamin', learned: 4,
    topics: [
      ['Model relacyjny i algebra relacji', 3, 45], ['SQL – SELECT, złączenia i podzapytania', 3, 55],
      ['Funkcje agregujące i GROUP BY', 2, 35], ['Normalizacja – 1NF, 2NF, 3NF, BCNF', 4, 60], ['Diagramy ERD', 2, 35],
      ['Transakcje i własności ACID', 4, 50], ['Indeksy i optymalizacja zapytań', 4, 55], ['Widoki, procedury i wyzwalacze', 3, 45],
    ],
  },
  {
    name: 'Zarządzanie projektem informatycznym', exam: 17, color: '#f472b6', icon: 'briefcase', difficulty: 2, examType: 'kolokwium', learned: 3,
    topics: [
      ['Poziomy gotowości technologicznej TRL I–IX', 2, 40], ['Siedem pryncypiów PRINCE2', 3, 45], ['Analiza SWOT', 2, 30],
      ['Struktura organizacyjna i role w projekcie', 2, 35], ['Budżet projektu i Cash Flow', 4, 55],
      ['Zarządzanie ryzykiem', 3, 40], ['Metryka jakości produktu', 3, 40],
    ],
  },
  {
    name: 'Sieci komputerowe', exam: 24, color: '#f59e0b', icon: 'network', difficulty: 4, examType: 'egzamin', learned: 1,
    topics: [
      ['Model OSI i TCP/IP', 2, 40], ['Adresacja IPv4 i podział na podsieci', 4, 60], ['Routing statyczny i dynamiczny', 4, 55],
      ['Protokoły TCP i UDP', 3, 45], ['DNS, DHCP i HTTP', 3, 40], ['Bezpieczeństwo sieci – firewall i VPN', 4, 50], ['IPv6', 3, 45],
    ],
  },
];

const ARCHIVE = {
  name: 'Fizyka dla informatyków', exam: -38, color: '#10b981', icon: 'atom', difficulty: 4, examType: 'egzamin',
  topics: [['Kinematyka i dynamika punktu', 3, 50], ['Zasady zachowania', 3, 45], ['Drgania i fale', 4, 55], ['Elektrostatyka', 4, 55], ['Pole magnetyczne', 4, 60], ['Optyka falowa', 3, 45]],
};

const NOTES = [
  {
    subject: 1, title: 'Normalizacja – ściąga',
    content: '# Normalizacja\n\n- **1NF** – wartości atomowe, brak grup powtarzających się\n- **2NF** – 1NF + brak zależności częściowych od klucza\n- **3NF** – 2NF + brak zależności przechodnich\n- **BCNF** – każdy determinant jest kluczem kandydującym\n\nPrzykład: tabela Zamówienia(klient, adres_klienta) → wydzielić Klienci.',
  },
  {
    subject: 0, title: 'Lagrange – krok po kroku',
    content: '# Ekstrema warunkowe\n\n1. Funkcja Lagrange’a: L = f(x,y) − λ·g(x,y)\n2. Układ: ∂L/∂x = 0, ∂L/∂y = 0, g(x,y) = 0\n3. Wyznaczyć punkty krytyczne\n4. Sprawdzić hesjan obrzeżony\n\n⚠️ Nie zapomnieć o sprawdzeniu brzegu obszaru!',
  },
  {
    subject: 2, title: 'TRL – skrót poziomów',
    content: '# TRL I–IX\n\n- I – idea\n- II – koncepcja zastosowania\n- III – weryfikacja koncepcji\n- IV – moduły w laboratorium\n- V – środowisko zbliżone do rzeczywistego\n- VI – demonstracja prototypu\n- VII – warunki operacyjne\n- VIII – ostateczna forma\n- IX – gotowość na komercjalizację',
  },
];

const TIMES = ['08:00', '09:10', '14:00', '15:30', '17:45', '18:00', '19:10', '20:20', '21:00'];

export function seed() {
  const db = reset();
  const rand = rng(175675);
  const today = todayISO();
  const user = {
    id: uid(),
    name: 'Student Demo',
    email: DEMO.email,
    password: hashPassword(DEMO.password),
    plan: 'premium',
    avatarHue: 265,
    settings: { ...DEFAULT_SETTINGS, availability: [100, 150, 150, 150, 150, 120, 180], preferredTime: 'evening' },
    createdAt: addDays(today, -120) + 'T10:00:00.000Z',
  };
  db.users.push(user);

  const mkSession = (o) => ({ id: uid(), userId: user.id, status: 'done', reviewIndex: null, startTime: TIMES[Math.floor(rand() * TIMES.length)], ...o });

  // Archiwalny przedmiot – zapełnia historię (heatmapa)
  const arch = { id: uid(), userId: user.id, name: ARCHIVE.name, examDate: addDays(today, ARCHIVE.exam), examType: ARCHIVE.examType, color: ARCHIVE.color, icon: ARCHIVE.icon, difficulty: ARCHIVE.difficulty, createdAt: user.createdAt };
  db.subjects.push(arch);
  ARCHIVE.topics.forEach(([title, difficulty, est], i) => {
    db.topics.push({ id: uid(), subjectId: arch.id, title, difficulty, estMinutes: est, learnedMinutes: est, learnedAt: addDays(today, -110 + i * 10), reviewsDone: 3, mastery: 88 + Math.floor(rand() * 12), status: 'mastered', order: i });
  });
  const archTopics = db.topics.filter((t) => t.subjectId === arch.id);
  for (let d = -118; d <= -39; d++) {
    if (rand() < 0.32) continue;
    const t = archTopics[Math.floor(rand() * archTopics.length)];
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const type = rand() < 0.4 ? 'review' : 'learn';
      db.sessions.push(mkSession({ subjectId: arch.id, topicId: t.id, date: addDays(today, d), minutes: type === 'review' ? 20 : 30 + Math.floor(rand() * 4) * 10, type, title: type === 'review' ? `Powtórka · ${t.title}` : t.title }));
    }
  }
  // luźne sesje między sesjami (od -38 do -25)
  for (let d = -37; d <= -25; d++) {
    if (rand() < 0.55) continue;
    const t = archTopics[Math.floor(rand() * archTopics.length)];
    db.sessions.push(mkSession({ subjectId: arch.id, topicId: t.id, date: addDays(today, d), minutes: 20, type: 'review', title: `Powtórka · ${t.title}` }));
  }

  // Aktualne przedmioty
  const subjects = SUBJECTS.map((s) => {
    const subject = { id: uid(), userId: user.id, name: s.name, examDate: addDays(today, s.exam), examType: s.examType, color: s.color, icon: s.icon, difficulty: s.difficulty, createdAt: addDays(today, -26) + 'T10:00:00.000Z' };
    db.subjects.push(subject);
    const topics = s.topics.map(([title, difficulty, est], i) => ({ id: uid(), subjectId: subject.id, title, difficulty, estMinutes: est, learnedMinutes: 0, learnedAt: null, reviewsDone: 0, mastery: 0, status: 'new', order: i }));
    db.topics.push(...topics);
    return { subject, topics, learned: s.learned };
  });

  // Historia nauki – przeszłe 24 dni
  const learnQueue = [];
  subjects.forEach(({ subject, topics, learned }) => topics.slice(0, learned).forEach((t) => learnQueue.push({ subject, t })));
  learnQueue.sort(() => rand() - 0.5);
  let day = -16;
  for (const { subject, t } of learnQueue) {
    day += rand() < 0.75 ? 1 : 2;
    if (day > -2) day = -2 - Math.floor(rand() * 3);
    const date = addDays(today, day);
    let rest = t.estMinutes;
    const parts = Math.ceil(rest / 50);
    let p = 1;
    while (rest > 0) {
      const m = Math.min(50, rest);
      rest -= m;
      db.sessions.push(mkSession({ subjectId: subject.id, topicId: t.id, date, minutes: m, type: 'learn', title: parts > 1 ? `${t.title} (cz. ${p}/${parts})` : t.title }));
      p++;
    }
    t.learnedMinutes = t.estMinutes;
    t.learnedAt = date;
    t.status = 'learning';
    t.mastery = 45;
    let chain = true;
    REVIEW_OFFSETS.forEach((off, idx) => {
      const rd = addDays(date, off);
      if (rd >= today) return;
      const ok = rand() < 0.86;
      db.sessions.push(mkSession({ subjectId: subject.id, topicId: t.id, date: rd, minutes: 20, type: 'review', reviewIndex: idx, status: ok ? 'done' : 'missed', grade: ok ? 2 + Math.round(rand()) : undefined, title: `Powtórka ${idx + 1}/3 · ${t.title}` }));
      if (ok && chain) {
        t.reviewsDone = idx + 1;
        t.mastery = Math.min(100, t.mastery + 14 + Math.floor(rand() * 9));
      } else chain = false;
    });
    if (t.mastery >= 85) t.status = 'mastered';
  }
  // ciągła seria ostatnich dni – krótkie powtórki „fiszkowe”
  const learnedNow = learnQueue.filter(({ t }) => t.learnedAt);
  for (let d = -13; d <= -1; d++) {
    const date = addDays(today, d);
    if (db.sessions.some((s) => s.date === date && s.status === 'done')) continue;
    const pool = learnedNow.filter(({ t }) => t.learnedAt < date);
    if (!pool.length) continue;
    const { subject, t } = pool[Math.floor(rand() * pool.length)];
    db.sessions.push(mkSession({ subjectId: subject.id, topicId: t.id, date, minutes: 25, type: 'review', title: `Szybka powtórka · ${t.title}` }));
  }

  // kilka opuszczonych sesji (realizm)
  for (const d of [-9, -4]) {
    const { subject, topics } = subjects[Math.floor(rand() * subjects.length)];
    db.sessions.push(mkSession({ subjectId: subject.id, topicId: topics.at(-1).id, date: addDays(today, d), minutes: 45, type: 'learn', status: 'missed', title: topics.at(-1).title }));
  }

  // Notatki
  NOTES.forEach((n, i) => {
    const ts = addDays(today, -i * 3 - 1) + 'T18:30:00.000Z';
    db.notes.push({ id: uid(), userId: user.id, title: n.title, content: n.content, drawing: null, subjectId: subjects[n.subject].subject.id, aiAccess: i !== 2, tags: [], pinned: i === 0, color: null, createdAt: ts, updatedAt: ts });
  });

  // Plan od dziś
  generatePlan(db, user, today);
  // Pierwsza dzisiejsza sesja już zrobiona
  const first = db.sessions.filter((s) => s.userId === user.id && s.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  if (first) applySessionDone(db, first, 3);

  flush();
  return db;
}

export function seedIfEmpty() {
  const db = load();
  if (!db.users.length) {
    seed();
    console.log(`🌱 Utworzono konto demo: ${DEMO.email} / ${DEMO.password}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed();
  console.log(`🌱 Baza zresetowana. Konto demo: ${DEMO.email} / ${DEMO.password}`);
}
