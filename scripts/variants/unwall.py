# uso: unwall.py base render saida → píxeis azuis no render (parede pintada) passam ao tom do original, mantendo a luz
import sys,cv2,numpy as np
b=cv2.imread(sys.argv[1]);r=cv2.imread(sys.argv[2])
lb=cv2.cvtColor(b,cv2.COLOR_BGR2LAB).astype(np.float32);lr=cv2.cvtColor(r,cv2.COLOR_BGR2LAB).astype(np.float32)
blue_r=128-lr[...,2]; blue_b=128-lb[...,2]   # b* negativo = azul
w=np.clip((blue_r-blue_b-6)/10,0,1)*(lr[...,2]<126)
w=cv2.GaussianBlur(w.astype(np.float32),(5,5),0)
out=lr.copy()
for c in (1,2): out[...,c]=lr[...,c]*(1-w)+lb[...,c]*w   # cor do original, luminância do render
res=cv2.cvtColor(np.clip(out,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR)
cv2.imwrite(sys.argv[3],res,[cv2.IMWRITE_WEBP_QUALITY,92]);print('píxeis azuis corrigidos',int((w>0.5).sum()))
