import products from '../data/products.json';
import rooms from '../data/rooms.json';
import roomProducts from '../data/room-products.json';

export const byId = new Map(products.map(p => [p.id, p]));
export const roomList = rooms.rooms;
export const roomById = new Map(roomList.map(r => [r.id, r]));
export const partLabels = Object.fromEntries(products.map(p => [p.part, p.partLabel]));
const local = path => (path ? '/catalog/' + path.replace(/^assets\//, '') : null);
const small = p => (p.media?.preview ? local(`${p.media.preview.base}-640.webp`) : local(p.thumb));

/** Produtos de uma divisão, agrupados por componente (part). */
export function roomCatalog(roomId) {
  const room = roomById.get(roomId);
  if (!room) return null;
  const inRoom = new Set(roomProducts[roomId] || []);
  return room.parts.map(part => ({
    part,
    label: partLabels[part] || part,
    products: products.filter(p => p.part === part && inRoom.has(p.id)).map(p => p.id),
  })).filter(g => g.products.length);
}

/** Seleção inicial do catálogo do cliente: apenas opções dentro do plafond e disponíveis. */
export function defaultAllowed() {
  const out = {};
  for (const room of roomList) {
    out[room.id] = (roomCatalog(room.id) || []).flatMap(g => g.products)
      .filter(id => { const p = byId.get(id); return !p.extra && p.available !== false; });
  }
  return out;
}

/** Vista pública (cliente): sem preços, plafonds nem notas internas. */
export function publicProduct(id) {
  const p = byId.get(id);
  if (!p) return null;
  return { id: p.id, part: p.part, title: p.title, brand: p.brand, ref: p.ref, description: p.description, detail: p.detail,
    format: p.format, color: p.color, colorFamily: p.colorFamily, thumb: small(p), image: local(p.image) };
}

/** Vista de administração: acrescenta preço e desvio face ao plafond unitário. */
export function adminProduct(id) {
  const p = byId.get(id);
  if (!p) return null;
  return { ...publicProduct(id), price: p.price, unit: p.unit, limit: p.limit, priceKind: p.priceKind, extra: !!p.extra,
    available: p.available !== false, supplier: p.supplier, url: p.url, notes: p.notes,
    delta: p.price != null && p.limit != null ? Math.round((p.price - p.limit) * 100) / 100 : null };
}

export function viewFor(session, { admin = false } = {}) {
  const make = admin ? adminProduct : publicProduct;
  const rooms = roomList.map(room => {
    const allowed = new Set(session.allowed[room.id] || []);
    const groups = (roomCatalog(room.id) || []).map(g => ({
      part: g.part, label: g.label,
      products: g.products.filter(id => admin || allowed.has(id)).map(id => ({ ...make(id), allowed: allowed.has(id) })),
    })).filter(g => g.products.length);
    return { id: room.id, label: room.label, title: room.title, groups, selection: session.selections[room.id] || {} };
  }).filter(r => r.groups.length);
  return { slug: session.slug, name: session.name, notes: session.notes || '', rooms };
}

export function validateSelection(session, roomId, part, productId) {
  const room = roomById.get(roomId);
  if (!room || !room.parts.includes(part)) return false;
  if (productId === null) return true;
  const [id, hex] = productId.split('#');  // cor à escolha: "paint-custom#rrggbb"
  if (hex !== undefined && !(id === 'paint-custom' && /^[0-9a-f]{6}$/i.test(hex))) return false;
  const p = byId.get(id);
  return !!p && p.part === part && (session.allowed[roomId] || []).includes(id);
}
