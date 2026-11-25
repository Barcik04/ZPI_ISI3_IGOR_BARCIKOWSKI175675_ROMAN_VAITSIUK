import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const empty = () => ({
  users: [],
  tokens: {},
  subjects: [],
  topics: [],
  sessions: [],
  notes: [],
  reports: {},
});

let db = null;

export function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    db = empty();
  }
  const base = empty();
  for (const k of Object.keys(base)) db[k] ??= base[k];
  return db;
}

export function reset() {
  db = empty();
  return db;
}

let timer = null;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 80);
}

export function flush() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1));
}

export const uid = () => crypto.randomUUID();

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

export function newToken() {
  return crypto.randomBytes(24).toString('hex');
}
