import {checkPassword, makeCookie, clearCookie, adminConfigured} from '../../../../lib/server/auth';
import {handle, fail, body} from '../../../../lib/server/http';
export const POST = handle(async request => {
  if (!adminConfigured()) return fail(503, 'ADMIN_PASSWORD não está definida no servidor.');
  const {password, logout} = await body(request, 1024);
  if (logout) return new Response('{}', {headers: {'Set-Cookie': clearCookie(), 'content-type': 'application/json'}});
  await new Promise(r => setTimeout(r, 400));
  if (!checkPassword(password)) return fail(401, 'Palavra-passe incorreta.');
  return new Response('{}', {headers: {'Set-Cookie': makeCookie(), 'content-type': 'application/json'}});
});
