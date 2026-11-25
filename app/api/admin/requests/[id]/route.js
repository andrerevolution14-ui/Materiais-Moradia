import {store} from '../../../../../lib/server/store';
import {isAdmin} from '../../../../../lib/server/auth';
import {handle, json, fail, body} from '../../../../../lib/server/http';
export const PATCH = handle(async (request, {params}) => {
  if (!isAdmin(request)) return fail(401, 'Sem sessão de administrador.');
  const b = await body(request, 4096), status = ['novo', 'em análise', 'aprovado', 'recusado'].includes(b.status) ? b.status : undefined;
  const r = await store.updateRequest((await params).id, {status, adminNote: typeof b.adminNote === 'string' ? b.adminNote.slice(0, 2000) : undefined});
  return r ? json(r) : fail(404, 'Pedido não encontrado.');
});
