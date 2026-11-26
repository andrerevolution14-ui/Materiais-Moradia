# Máscaras dos panoramas

Cada vista 360° (`public/pano/<vista>.webp`) tem uma máscara por componente do catálogo em `public/pano/masks/<vista>/<componente>.png`
(branco = zona onde o material é aplicado). A lista está em `data/masks.json`. Chaves `sala--floor-dry` indicam que a zona pertence a outra divisão (ex.: o chão da sala visto da cozinha).

Geradas com Segment Anything (`facebook/sam-vit-base`) a partir de pontos indicados à mão em `s_<vista>.json`:
- `pos` / `neg`: pontos dentro / fora da zona; `box`: caixa que limita a zona;
- `subtract`: retira a zona (ou a caixa) da máscara;
- `dark` / `light`: pixels escuros / claros dentro da caixa (caixilhos, frentes lisas); `close` e `fill` fecham buracos;
- `_grid: true`: coordenadas lidas na imagem de grelha de 1400 px (gerada por `grid.py`); senão, píxeis do panorama (1774 × 887).

Requisitos: Python com `torch`, `transformers`, `opencv-python-headless`, `pillow`. Uso: `bash scripts/masks/run.sh <vista>` (a partir da raiz do projeto).
