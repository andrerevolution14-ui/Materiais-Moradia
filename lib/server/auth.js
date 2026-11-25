import {createHmac, timingSafeEqual} from 'node:crypto';
const COOKIE = 'atelier_admin', TTL = 7 * 24 * 3600;
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = v => createHmac('sha256', secret()).update(v).digest('base64url');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export const adminConfigured = () => !!process.env.ADMIN_PASSWORD;
export const checkPassword = p => adminConfigured() && typeof p === 'string' && same(createHmac('sha256', 'pw').update(p).digest('hex'), createHmac('sha256', 'pw').update(process.env.ADMIN_PASSWORD).digest('hex'));
export function makeCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return `${COOKIE}=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
export function isAdmin(request) {
  if (!adminConfigured()) return false;
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|; )${COOKIE}=(\\d+)\\.([\\w-]+)`));
  return !!m && Number(m[1]) > Date.now() / 1000 && same(m[2], sign(m[1]));
}
