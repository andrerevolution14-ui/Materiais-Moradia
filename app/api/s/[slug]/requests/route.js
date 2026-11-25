import {store} from '../../../../../lib/server/store';
import {roomById} from '../../../../../lib/catalog.server';
import {triage} from '../../../../../lib/server/triage';
import {handle, json, fail, body} from '../../../../../lib/server/http';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const POST = handle(async (request, {params}) => {
  const {slug} = await params, {room, text} = await body(request, 8192);
  if (!(await store.getSession(slug))) return fail(404, 'Sessão não encontrada.');
  const clean = typeof text === 'string' ? text.trim() : '';
  if (clean.length < 5 || clean.length > 2000) return fail(400, 'Descreva o pedido em 5 a 2000 caracteres.');
  const roomId = typeof room === 'string' && roomById.has(room) ? room : null;
  if ((await store.listRequests(slug)).length >= 50) return fail(429, 'Limite de pedidos atingido. Fale com o seu consultor.');
  const r = await store.addRequest(slug, {room: roomId, text: clean, ai: await triage(clean, roomId)});
  return json({id: r.id, summary: r.ai?.summary || '', status: r.status}, 201);
});
