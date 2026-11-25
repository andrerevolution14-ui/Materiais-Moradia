import {store} from '../../../../lib/server/store';
import {defaultAllowed} from '../../../../lib/catalog.server';
import {isAdmin} from '../../../../lib/server/auth';
import {handle, json, fail, body, SLUG, RESERVED, slugify} from '../../../../lib/server/http';
export const dynamic = 'force-dynamic';
export const GET = handle(async request => {
  if (!isAdmin(request)) return fail(401, 'Sem sessão de administrador.');
  const [sessions, requests] = await Promise.all([store.listSessions(), store.listRequests()]);
  return json({sessions: sessions.map(s => ({slug: s.slug, name: s.name, updatedAt: s.updatedAt, chosen: Object.values(s.selections).reduce((n, r) => n + Object.keys(r).length, 0), openRequests: requests.filter(r => r.slug === s.slug && r.status === 'novo').length}))});
});
export const POST = handle(async request => {
  if (!isAdmin(request)) return fail(401, 'Sem sessão de administrador.');
  const {name, slug} = await body(request, 2048);
  if (typeof name !== 'string' || !name.trim()) return fail(400, 'Indique o nome do cliente.');
  const s = slugify(slug || name);
  if (!SLUG.test(s) || RESERVED.has(s)) return fail(400, 'Endereço inválido ou reservado.');
  const created = await store.createSession({slug: s, name: name.trim().slice(0, 80), allowed: defaultAllowed(), selections: {}});
  return created ? json({slug: s}, 201) : fail(409, 'Já existe uma sessão com esse endereço.');
});
