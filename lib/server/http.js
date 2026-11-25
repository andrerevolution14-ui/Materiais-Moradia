export const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export const fail = (status, message) => json({ error: message }, status);
export async function body(request, limit = 65536) {
  const text = await request.text();
  if (text.length > limit) throw Object.assign(new Error('Pedido demasiado grande.'), { status: 413 });
  try { const v = JSON.parse(text || '{}'); if (v && typeof v === 'object') return v; } catch {}
  throw Object.assign(new Error('Pedido inválido.'), { status: 400 });
}
export const handle = fn => async (request, ctx) => {
  try {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (request.method !== 'GET' && origin && (!host || new URL(origin).host !== host)) return fail(403, 'Origem não permitida.');
    return await fn(request, ctx);
  } catch (e) { return fail(e.status || 500, e.status ? e.message : 'Erro interno.'); }
};
export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const RESERVED = new Set(['admin', 'api', '_next', 'legacy', 'static', 'public', '3d']);
export const slugify = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
