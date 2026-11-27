# uso: match.py base.png render.png masks_dir saida.webp → iguala a cor do render à do original (curvas por canal, medidas fora das zonas editadas)
import sys,glob,numpy as np,cv2
b=cv2.imread(sys.argv[1]);r=cv2.imread(sys.argv[2]);H,W=b.shape[:2]
if r.shape[:2]!=(H,W): r=cv2.resize(r,(W,H),interpolation=cv2.INTER_AREA)
m=np.zeros((H,W),np.uint8)
for f in glob.glob(sys.argv[3]+'/*.png'): m|=(cv2.imread(f,0)>20).astype(np.uint8)
keep=cv2.dilate(m,np.ones((31,31),np.uint8))==0
res=r.copy()
for c in range(3):
    x=r[...,c][keep].astype(np.float64);y=b[...,c][keep].astype(np.float64)
    # curva monótona: média do original para cada valor do render (suavizada), interpolada
    lut=np.zeros(256);cnt=np.bincount(x.astype(int),minlength=256);s=np.bincount(x.astype(int),weights=y,minlength=256)
    v=cnt>20;xs=np.nonzero(v)[0];ys=s[v]/cnt[v];ys=np.maximum.accumulate(ys)
    lut=np.interp(np.arange(256),xs,ys);lut=cv2.GaussianBlur(lut.reshape(1,-1).astype(np.float32),(1,9),0).ravel()
    res[...,c]=np.clip(lut[r[...,c]],0,255).astype(np.uint8)
before=np.abs(r.astype(np.float32)-b)[keep].mean();after=np.abs(res.astype(np.float32)-b)[keep].mean()
print('diferença fora das zonas: antes',round(float(before),1),'depois',round(float(after),1))
cv2.imwrite(sys.argv[4],res,[cv2.IMWRITE_WEBP_QUALITY,92])
