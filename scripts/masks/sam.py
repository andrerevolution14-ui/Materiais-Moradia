# uso: sam.py imagem.webp spec.json pasta_saida [overlay.jpg]
# spec: {"part": {"pos": [[x,y],...], "neg": [[x,y],...], "box": [x0,y0,x1,y1]?, "multi": n?}, ...}  (coordenadas no panorama 1774x887)
import sys, json, numpy as np, torch, cv2
from PIL import Image
from transformers import SamModel, SamProcessor
img_path, spec_path, out_dir = sys.argv[1:4]; ov_path = sys.argv[4] if len(sys.argv) > 4 else None
spec = json.load(open(spec_path)); torch.set_num_threads(4)
model = SamModel.from_pretrained('facebook/sam-vit-huge' if '--huge' in sys.argv else 'facebook/sam-vit-base').eval(); proc = SamProcessor.from_pretrained('facebook/sam-vit-base')
img = Image.open(img_path).convert('RGB'); W, H = img.size
if spec.pop('_grid', False):  # coordenadas lidas na imagem de grelha (1400 px de largura)
    k = W / 1400
    for v in spec.values():
        for g in (v if isinstance(v, list) else [v]):
            for key in ('pos', 'neg'):
                if key in g: g[key] = [[round(x * k), round(y * k)] for x, y in g[key]]
            if 'box' in g: g['box'] = [round(c * k) for c in g['box']]
# panorama com margem circular (para objetos que atravessam a costura): 25% de cada lado
pad = W // 4; wide = Image.new('RGB', (W + 2 * pad, H)); wide.paste(img.crop((W - pad, 0, W, H)), (0, 0)); wide.paste(img, (pad, 0)); wide.paste(img.crop((0, 0, pad, H)), (W + pad, 0))
inputs = proc(wide, return_tensors='pt')
with torch.no_grad(): emb = model.get_image_embeddings(inputs['pixel_values'])
import os; os.makedirs(out_dir, exist_ok=True)
colors = [(255,60,60),(60,200,60),(60,120,255),(255,200,0),(200,60,255),(0,220,220),(255,120,0),(255,0,150),(120,255,120)]
ov = np.array(img).astype(np.float32)
for ci, (part, s) in enumerate(spec.items()):
    acc = np.zeros((H, W), bool)
    groups = s if isinstance(s, list) else [s]
    for g in groups:
        if 'dark' in g or 'light' in g:  # pixels escuros/claros dentro da caixa (caixilhos, puxadores)
            x0,y0,x1,y1=g['box']; L=np.array(img.convert('L'),np.float32)[y0:y1,x0:x1]
            sel=(L<=g['dark']) if 'dark' in g else (L>=g['light'])
            k=g.get('close',5); sel=cv2.morphologyEx(sel.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((k,k),np.uint8))
            if g.get('fill'):  # preencher buracos interiores
                cs,_=cv2.findContours(sel,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); sel=np.zeros_like(sel); cv2.drawContours(sel,cs,-1,1,-1)
            sel=sel.astype(bool)
            if g.get('subtract'): acc[y0:y1,x0:x1]&=~sel
            else: acc[y0:y1,x0:x1]|=sel
            continue
        if g.get('subtract') and 'box' in g and not g.get('pos'):
            x0,y0,x1,y1=g['box']; acc[y0:y1,x0:x1]=False; continue
        pts = [[x + pad, y] for x, y in g.get('pos', [])] + [[x + pad, y] for x, y in g.get('neg', [])]
        lab = [1] * len(g.get('pos', [])) + [0] * len(g.get('neg', []))
        kw = dict(input_points=[[pts]], input_labels=[[lab]]) if pts else {}
        if 'box' in g: x0, y0, x1, y1 = g['box']; kw['input_boxes'] = [[[x0 + pad, y0, x1 + pad, y1]]]
        i2 = proc(wide, return_tensors='pt', **kw)
        with torch.no_grad(): o = model(image_embeddings=emb, input_points=i2.get('input_points'), input_labels=i2.get('input_labels'), input_boxes=i2.get('input_boxes'), multimask_output=True)
        masks = proc.image_processor.post_process_masks(o.pred_masks, i2['original_sizes'], i2['reshaped_input_sizes'])[0][0].numpy()
        sc = o.iou_scores[0, 0].numpy(); k = g.get('pick', int(np.argmax(sc)))
        m = masks[k]; full = m[:, pad:pad + W].copy(); full |= np.roll(np.pad(m[:, :pad], ((0,0),(0,W-pad))), W - pad, axis=1)[:, :W] & False
        # dobrar as margens para o outro lado
        left = m[:, :pad]; right = m[:, pad + W:]
        full[:, W - pad:] |= left; full[:, :pad] |= right
        if g.get('subtract'): acc &= ~full
        else: acc |= full
    for g in groups:
        pass
    m8 = (acc * 255).astype(np.uint8)
    m8 = cv2.GaussianBlur(m8, (3, 3), 0)
    os.makedirs(os.path.dirname(f'{out_dir}/{part}.png'), exist_ok=True); cv2.imwrite(f'{out_dir}/{part}.png', m8, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    c = np.array(colors[ci % len(colors)], np.float32); a = (m8[..., None] / 255.0) * 0.55
    ov = ov * (1 - a) + c * a
    print(part, round(acc.mean() * 100, 2), '% da imagem')
if ov_path: Image.fromarray(ov.astype(np.uint8)).resize((1280, 640)).save(ov_path, quality=85)
