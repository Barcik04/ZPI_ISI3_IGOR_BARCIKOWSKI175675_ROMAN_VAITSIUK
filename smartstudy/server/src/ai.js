// Moduł 2 – analiza materiałów (sylabus / notatki -> lista tematów)
// oraz asystent AI. Działa w „trybie regułowym” (opisanym w części V
// sprawozdania jako zabezpieczenie kosztów AI) – bez zewnętrznego API.
import { addDays, diffDays, todayISO } from './dates.js';

const strip = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

const HARD = [
  'calk', 'rozniczk', 'dowod', 'transformat', 'algorytm', 'zlozonos', 'optymaliz', 'rekurenc',
  'macierz', 'wektor', 'prawdopodob', 'normaliz', 'wspolbiezn', 'kryptograf', 'neuron', 'transakc',
  'szereg', 'granic', 'pochodn', 'termodynam', 'kwant', 'topolog', 'zaawans', 'teori', 'model',
  'dynamik', 'rownan', 'grafow', 'kompilat', 'indeks', 'routing', 'protokol', 'uczenie maszyn',
  'statystyk', 'regresj', 'fourier', 'laplace', 'tensor', 'asymptot', 'ryzyk', 'budzet', 'cash flow',
];
const EASY = [
  'wprowadzen', 'wstep', 'podstaw', 'przeglad', 'definicj', 'histori', 'pojeci', 'omowien',
  'organizac', 'powtorzen', 'podsumowan', 'przyklad', 'charakterystyk', 'klasyfikacj', 'elementy',
];
const META = [
  'ects', 'punkty', 'literatura', 'zaliczen', 'forma zajec', 'liczba godzin', 'prowadzac', 'cel przedmiotu',
  'efekty uczenia', 'metody dydakt', 'warunki', 'bibliografia', 'kod przedmiotu', 'semestr', 'jezyk wykladowy',
  'tresci programowe', 'wymagania wstepne', 'sylabus', 'kierunek', 'rok akademicki', 'ocena', 'egzamin pisemny',
];
const STOP = new Set(['oraz', 'przez', 'jako', 'dla', 'podstawy', 'wprowadzenie', 'metody', 'zasady', 'rodzaje', 'jego', 'sposoby', 'które', 'ktore', 'wybrane', 'między']);

const PREFIX =
  /^\s*(?:(?:\d{1,2}(?:\.\d{1,2})*[.)]?|[ivxlc]{1,5}[.)]|[a-z][.)]|[-–—•*·▪●◦>]+)\s+|(?:temat|wyk[łl]ad|lab(?:oratorium)?|[ćc]wiczeni[ea]|rozdzia[łl]|modu[łl]|zagadnienie|w|l|c)\s*\d{1,2}\s*[:.)\-–]?\s*)/i;

function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

function cleanTitle(s) {
  let t = s.replace(PREFIX, '').replace(PREFIX, '').trim();
  t = t.replace(/\s*\(\s*\d+\s*(h|godz\.?)\s*\)\s*$/i, '');
  t = t.replace(/[;:,.\s]+$/, '').replace(/\s+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function scoreDifficulty(title) {
  const n = strip(title);
  let d = 3;
  for (const k of HARD) if (n.includes(k)) d += 1;
  for (const k of EASY) if (n.includes(k)) d -= 1;
  if (title.length > 70) d += 1;
  if (title.length < 18) d -= 0.5;
  return Math.max(1, Math.min(5, Math.round(d)));
}

function keywords(title) {
  return [...new Set(title.split(/[^\p{L}\d-]+/u).filter((w) => w.length > 4 && !STOP.has(strip(w))))]
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

export function analyzeMaterial(text = '') {
  const t0 = performance.now();
  const rawLines = String(text).replace(/\r/g, '').split('\n');
  const candidates = [];

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;
    const structured = PREFIX.test(line);
    const n = strip(line);
    if (META.some((m) => n.startsWith(m) || (n.includes(m) && line.length < 60 && !structured))) continue;
    if (/:\s*$/.test(line) && !structured) continue; // nagłówek sekcji

    let parts = [line];
    if (line.length > 90 && /[;]/.test(line)) parts = line.split(';');
    else if (line.length > 110 && (line.match(/,/g) || []).length >= 3) parts = line.split(/,(?![^()]*\))/);
    else if (/:\s*\S/.test(line) && line.length > 60 && !structured) parts = [line.split(':').slice(1).join(':')];

    for (const p of parts) {
      const title = cleanTitle(p);
      const words = title.split(/\s+/).length;
      if (title.length < 4 || title.length > 140 || words > 18) continue;
      if (/^[\d\s.,%-]+$/.test(title)) continue;
      candidates.push({ title, structured: structured || parts.length > 1 });
    }
  }

  // Fallback: brak struktury -> zdania
  let pool = candidates;
  if (candidates.filter((c) => c.structured).length >= 3) pool = candidates.filter((c) => c.structured);
  if (!pool.length) {
    pool = String(text)
      .split(/(?<=[.!?])\s+/)
      .map((s) => ({ title: cleanTitle(s), structured: false }))
      .filter((c) => c.title.length > 8 && c.title.split(' ').length <= 16);
  }

  const seen = new Set();
  const topics = [];
  for (const c of pool) {
    const key = strip(c.title);
    if (seen.has(key)) continue;
    seen.add(key);
    const difficulty = scoreDifficulty(c.title);
    const words = c.title.split(/\s+/).length;
    const estMinutes = Math.round((20 + difficulty * 14 + Math.min(words, 12) * 1.5) / 5) * 5;
    const confidence = Math.round(((c.structured ? 0.88 : 0.7) + hash(c.title) * 0.1) * 100) / 100;
    topics.push({ title: c.title, difficulty, estMinutes, confidence, keywords: keywords(c.title) });
    if (topics.length >= 40) break;
  }

  const totalMinutes = topics.reduce((a, t) => a + t.estMinutes, 0);
  return {
    topics,
    stats: {
      lines: rawLines.filter((l) => l.trim()).length,
      detected: topics.length,
      totalMinutes,
      avgDifficulty: topics.length ? +(topics.reduce((a, t) => a + t.difficulty, 0) / topics.length).toFixed(1) : 0,
      processingMs: Math.max(1, Math.round(performance.now() - t0)),
      engine: 'SmartStudy Rule Engine v1 (tryb regułowy)',
    },
  };
}

// ───────────────────────── Asystent ─────────────────────────

const fmtDate = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
};
const h = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const pick = (arr, seed) => arr[Math.floor(hash(seed) * arr.length) % arr.length];

function sessionsList(list) {
  return list.map((s) => `- **${s.startTime}** · ${s.title} _(${h(s.minutes)})_`).join('\n');
}

export function assistantReply(db, user, message, helpers) {
  const today = todayISO();
  const n = strip(message);
  const subjects = db.subjects.filter((s) => s.userId === user.id);
  const sessions = db.sessions.filter((s) => s.userId === user.id);
  const topics = db.topics.filter((t) => subjects.some((s) => s.id === t.subjectId));
  const first = user.name.split(' ')[0];
  const has = (...k) => k.some((x) => n.includes(x));

  if (has('przelicz', 'zaleg', 'nie zdaz', 'opuscil', 'nie zdarz', 'przeplanuj', 'nowy plan', 'wygeneruj')) {
    const report = helpers.replan();
    let text = `Gotowe – przeliczyłem harmonogram od dziś. ⚙️\n\n- Sesji w planie: **${report.totalSessions}**\n- Nowy materiał: **${h(report.learnMinutes)}**, powtórki: **${h(report.reviewMinutes)}**`;
    if (report.autoMissed) text += `\n- Oznaczyłem **${report.autoMissed}** zaległych sesji jako opuszczone i rozłożyłem ich materiał na kolejne dni.`;
    if (report.feasible) text += `\n\n✅ Plan jest **wykonalny** w zadeklarowanym czasie.`;
    else {
      text += `\n\n⚠️ **Uwaga – plan nie mieści się w czasie.** Nie udaję, że jest inaczej:`;
      for (const d of report.deficits)
        text += `\n- **${d.subject}**: brakuje ${h(d.deficitMinutes)}. Opcje: +${d.suggestions.extraPerDay} min dziennie albo pominięcie: _${d.suggestions.dropTopics.slice(0, 3).join(', ')}_.`;
    }
    return { reply: text, suggestions: ['Co mam dziś?', 'Pokaż egzaminy', 'Jak mi idzie?'], action: 'replanned' };
  }

  if (has('jutro')) {
    const tm = addDays(today, 1);
    const list = sessions.filter((s) => s.date === tm && s.status === 'planned').sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (!list.length) return { reply: `Na jutro (${fmtDate(tm)}) nie masz zaplanowanych sesji. Idealny moment na odpoczynek 😌`, suggestions: ['Co mam dziś?', 'Pokaż egzaminy'] };
    const total = list.reduce((a, s) => a + s.minutes, 0);
    return { reply: `Plan na jutro – **${fmtDate(tm)}** (${h(total)}):\n\n${sessionsList(list)}`, suggestions: ['Co mam dziś?', 'Jak się uczyć efektywnie?'] };
  }

  if (has('dzis', 'dzisiaj', 'teraz', 'co mam', 'plan na')) {
    const list = sessions.filter((s) => s.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const todo = list.filter((s) => s.status === 'planned');
    const done = list.filter((s) => s.status === 'done');
    if (!list.length) return { reply: `Na dziś nic nie zaplanowano, ${first}. Możesz dodać przedmiot albo wygenerować plan w **Kreatorze AI** ✨`, suggestions: ['Przelicz plan', 'Pokaż egzaminy'] };
    let text = `Twój plan na dziś (${fmtDate(today)}):\n\n${sessionsList(list.map((s) => ({ ...s, title: (s.status === 'done' ? '✅ ' : s.status === 'missed' ? '❌ ' : '') + s.title })))}`;
    text += `\n\nZrobione: **${done.length}/${list.length}**. ${todo.length ? `Zostało ${h(todo.reduce((a, s) => a + s.minutes, 0))} – dasz radę! 💪` : 'Wszystko odhaczone – brawo! 🎉'}`;
    return { reply: text, suggestions: ['Co mam jutro?', 'Ile mam powtórek?', 'Motywacja!'] };
  }

  if (has('egzamin', 'kolokw', 'kiedy', 'ile dni', 'termin')) {
    const up = subjects.filter((s) => s.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate));
    if (!up.length) return { reply: 'Nie masz nadchodzących egzaminów. Dodaj przedmiot z terminem w zakładce **Przedmioty**.', suggestions: ['Co mam dziś?'] };
    const lines = up.map((s) => {
      const ts = topics.filter((t) => t.subjectId === s.id);
      const learned = ts.filter((t) => t.learnedAt).length;
      const dd = diffDays(today, s.examDate);
      return `- **${s.name}** – ${fmtDate(s.examDate)} (${dd === 0 ? '**DZIŚ!**' : `za **${dd}** ${dd === 1 ? 'dzień' : 'dni'}`}) · opanowane ${learned}/${ts.length} tematów`;
    });
    return { reply: `Nadchodzące terminy:\n\n${lines.join('\n')}\n\nNajbliżej jest **${up[0].name}** – na nim skupia się dziś najwięcej sesji.`, suggestions: ['Co mam dziś?', 'Najtrudniejsze tematy', 'Przelicz plan'] };
  }

  if (has('powtork', 'fiszk', 'zapamiet', 'zapomin')) {
    const due = sessions.filter((s) => s.type === 'review' && s.status === 'planned' && s.date <= today);
    const week = sessions.filter((s) => s.type === 'review' && s.status === 'planned' && s.date > today && s.date <= addDays(today, 7));
    return {
      reply: `Masz **${due.length}** powtórek do zrobienia dziś i **${week.length}** w ciągu tygodnia.\n\nStosuję model **1 → 3 → 7 dni** po pierwszej nauce tematu – każda powtórka trafia tuż przed moment, w którym krzywa zapominania spada najmocniej. Żadnej powtórki nie planuję po egzaminie. 🧠`,
      suggestions: ['Jak się uczyć efektywnie?', 'Co mam dziś?'],
    };
  }

  if (has('trudn', 'ciezk', 'najgorsz', 'problem')) {
    const hard = topics.filter((t) => t.status !== 'mastered').sort((a, b) => (b.difficulty - a.difficulty) || ((a.mastery || 0) - (b.mastery || 0))).slice(0, 5);
    const sName = (id) => subjects.find((s) => s.id === id)?.name;
    return {
      reply: `Tematy, które wymagają najwięcej uwagi:\n\n${hard.map((t) => `- **${t.title}** · ${sName(t.subjectId)} · trudność ${'●'.repeat(t.difficulty)}${'○'.repeat(5 - t.difficulty)} · opanowanie ${t.mastery || 0}%`).join('\n')}\n\nTrudniejsze tematy planuję wcześniej i w krótszych blokach, żeby zostało miejsce na powtórki.`,
      suggestions: ['Jak się uczyć efektywnie?', 'Przelicz plan'],
    };
  }

  if (has('postep', 'statyst', 'jak mi idzie', 'wynik', 'podsumuj')) {
    const st = helpers.stats();
    return {
      reply: `Twoje podsumowanie, ${first}:\n\n- 🔥 Seria: **${st.streak}** ${st.streak === 1 ? 'dzień' : 'dni'} z rzędu\n- ⏱️ Łącznie: **${h(st.totalMinutes)}** nauki\n- ✅ Realizacja planu: **${st.completionRate}%**\n- 📚 Opanowane tematy: **${st.learnedTopics}/${st.totalTopics}**\n\n${st.completionRate >= 80 ? 'Świetne tempo – trzymaj tak dalej!' : 'Jest dobrze, ale część sesji ucieka. Spróbuj krótszych bloków (np. 25 min) – łatwiej je utrzymać.'}`,
      suggestions: ['Najtrudniejsze tematy', 'Co mam dziś?'],
    };
  }

  if (has('motyw', 'nie chce', 'zmecz', 'nudz', 'stres', 'boje', 'nie dam')) {
    const quotes = [
      'Nie musisz mieć motywacji, żeby zacząć. Musisz zacząć, żeby mieć motywację.',
      'Mały krok dziś > wielki plan jutro.',
      'Mózg to mięsień – każda sesja to kolejne powtórzenie na siłowni.',
      'Za tydzień będziesz wdzięczny sobie z dzisiaj.',
    ];
    return {
      reply: `${pick(quotes, message + today)} 💜\n\nPropozycja: włącz **Tryb Skupienia** na 25 minut i zrób tylko pierwszą sesję z dzisiejszego planu. Po niej 5 minut przerwy – bez telefonu. Zwykle po pierwszym bloku idzie już z górki.`,
      suggestions: ['Co mam dziś?', 'Jak się uczyć efektywnie?'],
    };
  }

  if (has('jak sie uczyc', 'technik', 'porad', 'efektywn', 'metod', 'tip')) {
    return {
      reply: `Sprawdzone techniki, na których opiera się SmartStudy:\n\n- **Active recall** – zamknij notatki i spróbuj odtworzyć materiał z pamięci.\n- **Spaced repetition** – powtórki po 1, 3 i 7 dniach (robię to za Ciebie).\n- **Pomodoro** – 25–50 min skupienia + krótka przerwa.\n- **Technika Feynmana** – wytłumacz temat „jak 12-latkowi”.\n- **Interleaving** – przeplatanie przedmiotów; dlatego Twój plan miesza tematy.`,
      suggestions: ['Motywacja!', 'Co mam dziś?'],
    };
  }

  if (has('notat')) {
    const notes = db.notes.filter((x) => x.userId === user.id);
    const ai = notes.filter((x) => x.aiAccess).length;
    return {
      reply: `Masz **${notes.length}** notatek, z czego **${ai}** udostępniłeś mi do analizy. Notatki odręczne zapisuję jako obraz – rozpoznawanie pisma (OCR) jest w przygotowaniu, więc ich treść na razie nie wpływa na plan.\n\nW panelu notatek możesz kliknąć **„Wyciągnij tematy”**, a ja zamienię notatkę w listę tematów do planu.`,
      suggestions: ['Co mam dziś?'],
    };
  }

  if (has('czesc', 'hej', 'siema', 'witaj', 'dzien dobry', 'hello')) {
    return {
      reply: `Hej ${first}! 👋 Jestem Twoim asystentem nauki. Mogę pokazać plan, policzyć ile zostało do egzaminu, przeliczyć harmonogram po zaległościach albo podrzucić techniki nauki. W czym pomóc?`,
      suggestions: ['Co mam dziś?', 'Pokaż egzaminy', 'Przelicz plan', 'Jak mi idzie?'],
    };
  }

  return {
    reply: `Nie jestem pewien, o co chodzi 🤔 Spróbuj zapytać np.:\n\n- „Co mam dziś?”\n- „Ile dni do egzaminu?”\n- „Nie zdążyłem – przelicz plan”\n- „Jakie są moje najtrudniejsze tematy?”\n- „Jak się uczyć efektywnie?”`,
    suggestions: ['Co mam dziś?', 'Pokaż egzaminy', 'Przelicz plan'],
  };
}
