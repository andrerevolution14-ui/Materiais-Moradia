import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {neon} from '@neondatabase/serverless';

/* Armazenamento: Neon (DATABASE_URL) em produção; ficheiro local .data/store.json em desenvolvimento. */
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sessions (slug text PRIMARY KEY, name text NOT NULL, notes text NOT NULL DEFAULT '',
    allowed jsonb NOT NULL DEFAULT '{}', selections jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS change_requests (id uuid PRIMARY KEY, slug text NOT NULL REFERENCES sessions(slug) ON DELETE CASCADE,
    room text, text text NOT NULL, status text NOT NULL DEFAULT 'novo', admin_note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now())`,
];

function neonStore() {
  const sql = neon(url);
  let ready;
  const init = () => (ready ||= (async () => { for (const s of SCHEMA) await sql.query(s); })().catch(e => { ready = null; throw e; }));
  const q = async (text, params = []) => { await init(); return sql.query(text, params); };
  const toSession = r => r && ({ slug: r.slug, name: r.name, notes: r.notes, allowed: r.allowed, selections: r.selections, createdAt: r.created_at, updatedAt: r.updated_at });
  const toRequest = r => ({ id: r.id, slug: r.slug, room: r.room, text: r.text, status: r.status, adminNote: r.admin_note, createdAt: r.created_at });
  return {
    kind: 'neon',
    async getSession(slug) { return toSession((await q('SELECT * FROM sessions WHERE slug=$1', [slug]))[0]); },
    async listSessions() { return (await q('SELECT * FROM sessions ORDER BY updated_at DESC')).map(toSession); },
    async createSession(s) {
      const r = await q('INSERT INTO sessions (slug,name,notes,allowed,selections) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING *',
        [s.slug, s.name, s.notes || '', JSON.stringify(s.allowed), JSON.stringify(s.selections || {})]);
      return toSession(r[0]);
    },
    async updateSession(slug, p) {
      const r = await q(`UPDATE sessions SET name=COALESCE($2,name), notes=COALESCE($3,notes), allowed=COALESCE($4,allowed),
        selections=COALESCE($5,selections), updated_at=now() WHERE slug=$1 RETURNING *`,
        [slug, p.name ?? null, p.notes ?? null, p.allowed ? JSON.stringify(p.allowed) : null, p.selections ? JSON.stringify(p.selections) : null]);
      return toSession(r[0]);
    },
    async setSelection(slug, room, part, productId) {
      const r = await q(`UPDATE sessions SET selections = CASE WHEN $4::text IS NULL
          THEN jsonb_set(selections, ARRAY[$2], COALESCE(selections->$2,'{}'::jsonb) - $3, true)
          ELSE jsonb_set(selections, ARRAY[$2], COALESCE(selections->$2,'{}'::jsonb) || jsonb_build_object($3::text,$4::text), true) END,
        updated_at=now() WHERE slug=$1 RETURNING *`, [slug, room, part, productId]);
      return toSession(r[0]);
    },
    async deleteSession(slug) { await q('DELETE FROM sessions WHERE slug=$1', [slug]); },
    async addRequest(slug, x) {
      const r = await q('INSERT INTO change_requests (id,slug,room,text) VALUES ($1,$2,$3,$4) RETURNING *', [randomUUID(), slug, x.room || null, x.text]);
      return toRequest(r[0]);
    },
    async listRequests(slug) { return (await q(slug ? 'SELECT * FROM change_requests WHERE slug=$1 ORDER BY created_at DESC' : 'SELECT * FROM change_requests ORDER BY created_at DESC LIMIT 200', slug ? [slug] : [])).map(toRequest); },
    async updateRequest(id, p) {
      const r = await q('UPDATE change_requests SET status=COALESCE($2,status), admin_note=COALESCE($3,admin_note) WHERE id=$1 RETURNING *', [id, p.status ?? null, p.adminNote ?? null]);
      return r[0] ? toRequest(r[0]) : null;
    },
  };
}

function fileStore() {
  const file = resolve(process.env.DATA_FILE || '.data/store.json');
  let chain = Promise.resolve();
  const load = async () => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return { sessions: {}, requests: [] }; } };
  const tx = fn => (chain = chain.then(async () => { const db = await load(); const out = await fn(db); await mkdir(resolve(file, '..'), { recursive: true }); await writeFile(file, JSON.stringify(db, null, 1)); return out; }));
  const now = () => new Date().toISOString();
  return {
    kind: 'file',
    getSession: slug => tx(db => db.sessions[slug] || null),
    listSessions: () => tx(db => Object.values(db.sessions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
    createSession: s => tx(db => db.sessions[s.slug] ? null : (db.sessions[s.slug] = { notes: '', selections: {}, ...s, createdAt: now(), updatedAt: now() })),
    updateSession: (slug, p) => tx(db => { const s = db.sessions[slug]; if (!s) return null; for (const k of ['name', 'notes', 'allowed', 'selections']) if (p[k] !== undefined) s[k] = p[k]; s.updatedAt = now(); return s; }),
    setSelection: (slug, room, part, id) => tx(db => { const s = db.sessions[slug]; if (!s) return null; const r = (s.selections[room] ||= {}); if (id === null) delete r[part]; else r[part] = id; s.updatedAt = now(); return s; }),
    deleteSession: slug => tx(db => { delete db.sessions[slug]; db.requests = db.requests.filter(r => r.slug !== slug); }),
    addRequest: (slug, x) => tx(db => { const r = { id: randomUUID(), slug, room: x.room || null, text: x.text, status: 'novo', adminNote: '', createdAt: now() }; db.requests.unshift(r); return r; }),
    listRequests: slug => tx(db => db.requests.filter(r => !slug || r.slug === slug)),
    updateRequest: (id, p) => tx(db => { const r = db.requests.find(x => x.id === id); if (!r) return null; if (p.status !== undefined) r.status = p.status; if (p.adminNote !== undefined) r.adminNote = p.adminNote; return r; }),
  };
}

if (!url && process.env.VERCEL) throw new Error('DATABASE_URL (Neon) não está definido.');
export const store = globalThis.__store ||= (url ? neonStore() : fileStore());
