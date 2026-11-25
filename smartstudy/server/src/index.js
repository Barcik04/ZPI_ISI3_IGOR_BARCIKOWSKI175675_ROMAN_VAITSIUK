import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { load, flush } from './db.js';
import { seedIfEmpty, DEMO } from './seed.js';
import api from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'SmartStudy API', time: new Date().toISOString() }));
app.get('/api/demo', (_req, res) => res.json(DEMO));
app.use('/api', api);

// Zbudowany frontend (npm run build) serwowany z tego samego serwera
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Błąd serwera – spróbuj ponownie.' });
});

load();
seedIfEmpty();

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`⚡ SmartStudy API działa na http://localhost:${PORT}`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    flush();
    process.exit(0);
  });
}
