// Daty przechowujemy jako 'YYYY-MM-DD' i liczymy w UTC, żeby uniknąć
// przesunięć przy zmianie czasu letni/zimowy (ryzyko nr 5 z TRL IV).

const pad = (n) => String(n).padStart(2, '0');

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** b - a w dniach */
export function diffDays(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/** 0 = niedziela … 6 = sobota */
export function weekday(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function minutesToHHMM(m) {
  const h = Math.floor(m / 60) % 24;
  return `${pad(h)}:${pad(m % 60)}`;
}

export function hhmmToMinutes(s = '00:00') {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
