/* Cor aproximada de cada produto para pintar a malha 3D. Pinturas têm cor fixa; os restantes usam a cor dominante da fotografia do produto. */
export const PAINT_HEX = {'pintura-cin': '#efece4', 'paint-sage': '#a7b59e', 'paint-sloop': '#6f89a4', 'paint-cotta': '#c1694c', 'paint-havana': '#cdb2a0'};
const cache = new Map();
export function productColor(product) {
  if (PAINT_HEX[product.id]) return Promise.resolve(PAINT_HEX[product.id]);
  const url = product.thumb || product.image;
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) cache.set(url, new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const S = 48, c = document.createElement('canvas'); c.width = c.height = S;
        const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, S, S);
        const px = g.getImageData(0, 0, S, S).data, keep = [[], [], []], all = [0, 0, 0]; let n = 0;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], gg = px[i + 1], b = px[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
          if (px[i + 3] < 200 || (r > 238 && gg > 238 && b > 238)) continue;  // fundo branco da fotografia
          all[0] += r; all[1] += gg; all[2] += b; n++;
          if (mx < 235 && mx > 25 && !((mx - mn) / mx < 0.06 && mx > 200)) { keep[0].push(r); keep[1].push(gg); keep[2].push(b); }
        }
        if (!n) return resolve(null);
        const med = a => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
        const rgb = keep[0].length > 60 ? keep.map(med) : all.map(v => v / n);  // mediana das zonas com cor; média nos produtos muito claros
        resolve('#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null); img.src = url;
  }));
  return cache.get(url);
}
