/* Composição de um panorama com os materiais escolhidos.
   Para cada componente com máscara (PNG em tons de cinzento, branco = zona do componente):
   - se existir uma variante fotorrealista (imagem IA alinhada), copia-a dentro da máscara;
   - senão, aplica a cor do produto mantendo a luz do render: cor_nova × (luminância do pixel / luminância média da zona).
   Assim mantêm-se as sombras, reflexos e o veio da madeira ou do mármore originais. */
const images = new Map(), pixels = new Map();
export function loadImage(url) {
  if (!images.has(url)) images.set(url, new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; }));
  return images.get(url);
}
async function data(url, w, h) {
  const key = `${url}@${w}x${h}`;
  if (!pixels.has(key)) pixels.set(key, loadImage(url).then(img => {
    if (!img) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently: true});
    g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h).data;
  }));
  return pixels.get(key);
}
const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const LIN = Float32Array.from({length: 256}, (_, i) => toLin(i));
const toSrgb = v => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const hexLin = hex => [1, 3, 5].map(i => LIN[parseInt(hex.slice(i, i + 2), 16)]);

/* layers: [{mask: url, hex?: '#rrggbb', variant?: url, strength?: 0..1}] */
export async function compose(baseUrl, layers, canvas) {
  const base = await loadImage(baseUrl); if (!base) return null;
  const w = base.naturalWidth, h = base.naturalHeight;
  const c = canvas || document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(base, 0, 0);
  if (!layers.length) return c;
  const img = g.getImageData(0, 0, w, h), px = img.data, src = Uint8ClampedArray.from(px);
  for (const L of layers) {
    const m = await data(L.mask, w, h); if (!m) continue;
    if (L.variant) {
      const v = await data(L.variant, w, h); if (!v) continue;
      for (let i = 0; i < px.length; i += 4) { const a = m[i] / 255; if (a) for (let k = 0; k < 3; k++) px[i + k] = px[i + k] * (1 - a) + v[i + k] * a; }
      continue;
    }
    if (!L.hex) continue;
    let sum = 0, n = 0;
    for (let i = 0; i < px.length; i += 16) { const a = m[i]; if (a > 128) { sum += 0.2126 * LIN[src[i]] + 0.7152 * LIN[src[i + 1]] + 0.0722 * LIN[src[i + 2]]; n++; } }
    if (!n) continue;
    const mean = sum / n, t = hexLin(L.hex), s = L.strength ?? 1;
    for (let i = 0; i < px.length; i += 4) {
      const a = m[i] / 255 * s; if (!a) continue;
      const r = LIN[src[i]], gg = LIN[src[i + 1]], b = LIN[src[i + 2]], shade = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / mean;
      const hi = Math.max(0, shade - 1.25) * 0.5;  // realces especulares ficam claros
      for (let k = 0; k < 3; k++) { const o = toSrgb(Math.min(1, t[k] * shade + hi)); px[i + k] = px[i + k] * (1 - a) + o * a; }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
