import {store} from '../../../../../lib/server/store';
import {validateSelection} from '../../../../../lib/catalog.server';
import {handle, json, fail, body} from '../../../../../lib/server/http';
export const dynamic = 'force-dynamic';
export const PUT = handle(async (request, {params}) => {
  const {slug} = await params, {room, part, product = null} = await body(request);
  const session = await store.getSession(slug);
  if (!session) return fail(404, 'Sessão não encontrada.');
  if (typeof room !== 'string' || typeof part !== 'string' || (product !== null && typeof product !== 'string') || !validateSelection(session, room, part, product)) return fail(400, 'Escolha não disponível neste catálogo.');
  const updated = await store.setSelection(slug, room, part, product);
  return json({selections: updated.selections});
});
