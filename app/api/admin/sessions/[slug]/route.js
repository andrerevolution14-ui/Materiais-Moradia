import {store} from '../../../../../lib/server/store';
import {viewFor, byId, roomById} from '../../../../../lib/catalog.server';
import {isAdmin} from '../../../../../lib/server/auth';
import {handle, json, fail, body} from '../../../../../lib/server/http';
export const dynamic = 'force-dynamic';
const guard = request => isAdmin(request) ? null : fail(401, 'Sem sessão de administrador.');
export const GET = handle(async (request, {params}) => {
  const denied = guard(request); if (denied) return denied;
  const session = await store.getSession((await params).slug);
  if (!session) return fail(404, 'Sessão não encontrada.');
  return json({...viewFor(session, {admin: true}), requests: await store.listRequests(session.slug)});
});
/** PATCH: {name?, notes?, allow?: {room, product, on}} — liga/desliga um material no catálogo do cliente. */
export const PATCH = handle(async (request, {params}) => {
  const denied = guard(request); if (denied) return denied;
  const {slug} = await params, b = await body(request, 4096), session = await store.getSession(slug);
  if (!session) return fail(404, 'Sessão não encontrada.');
  const patch = {};
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 80);
  if (typeof b.notes === 'string') patch.notes = b.notes.slice(0, 2000);
  if (b.allow) {
    const {room, product, on} = b.allow, p = byId.get(product);
    if (!roomById.has(room) || !p || !roomById.get(room).parts.includes(p.part)) return fail(400, 'Material inválido para esta divisão.');
    const set = new Set(session.allowed[room] || []);
    on ? set.add(product) : set.delete(product);
    patch.allowed = {...session.allowed, [room]: [...set]};
    if (!on) { const sel = {...(session.selections[room] || {})}; if ((sel[p.part] || '').split('#')[0] === product) { delete sel[p.part]; patch.selections = {...session.selections, [room]: sel}; } }
  }
  await store.updateSession(slug, patch);
  return json({ok: true});
});
export const DELETE = handle(async (request, {params}) => {
  const denied = guard(request); if (denied) return denied;
  await store.deleteSession((await params).slug);
  return json({ok: true});
});
