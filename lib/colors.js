/* Cor aproximada de cada produto para pintar a malha 3D. Pinturas têm cor fixa; os restantes usam a cor média da amostra. */
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
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, 32, 32);
        const px = g.getImageData(0, 0, 32, 32).data; let r = 0, gr = 0, b = 0, n = 0, R = 0, G = 0, B = 0, N = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 200) continue; R += px[i]; G += px[i + 1]; B += px[i + 2]; N++;
          if (px[i] > 238 && px[i + 1] > 238 && px[i + 2] > 238) continue;  // fundo branco da fotografia
          r += px[i]; gr += px[i + 1]; b += px[i + 2]; n++;
        }
        if (!n && !N) return resolve(null);
        const [x, y, z] = n > 40 ? [r / n, gr / n, b / n] : [R / N, G / N, B / N];
        resolve('#' + [x, y, z].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null); img.src = url;
  }));
  return cache.get(url);
}
