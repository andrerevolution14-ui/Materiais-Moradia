import {store} from '../../../../lib/server/store';
import {viewFor} from '../../../../lib/catalog.server';
import {handle, json, fail} from '../../../../lib/server/http';
export const dynamic = 'force-dynamic';
export const GET = handle(async (_r, {params}) => {
  const session = await store.getSession((await params).slug);
  if (!session) return fail(404, 'Sessão não encontrada.');
  const requests = (await store.listRequests(session.slug)).map(({id, room, text, ai, status, createdAt}) => ({id, room, text, summary: ai?.summary || '', status, createdAt}));
  return json({...viewFor(session), requests});
});
