# uso: refine.py base render masks_dir n parts...  → grava <part>@<n>.png: máscara do elemento + píxeis vizinhos que mudaram neste render
import sys,cv2,numpy as np
b=cv2.imread(sys.argv[1]);r=cv2.imread(sys.argv[2]);D=sys.argv[3];n=sys.argv[4];parts=sys.argv[5:]
lb=cv2.cvtColor(b,cv2.COLOR_BGR2LAB).astype(np.float32);lr=cv2.cvtColor(r,cv2.COLOR_BGR2LAB).astype(np.float32)
de=np.sqrt(((lb-lr)**2).sum(2));diff=(cv2.GaussianBlur(de,(5,5),0)>14).astype(np.uint8)
diff=cv2.morphologyEx(diff,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
import os
M={p:(cv2.imread(f'{D}/{p}.png',0)>127).astype(np.uint8) for p in parts}
import glob
fixed=[q for q in ('wall-paint','skirting') if os.path.exists(f'{D}/{q}.png')]+[os.path.basename(x)[:-4] for x in glob.glob(f'{D}/keep-*.png')]  # zonas que nunca mudam: não podem entrar na extensão
F={q:(cv2.imread(f'{D}/{q}.png',0)>127).astype(np.uint8) for q in fixed}
# píxeis com a cor das paredes deste render (ex.: parede azul do render 1) nunca entram na extensão
wallc=None
if 'wall-paint' in F:
    wm=cv2.erode(F['wall-paint'],np.ones((9,9),np.uint8)).astype(bool);wallc=np.median(lr[wm],0)
    likewall=(np.sqrt(((lr-wallc)**2).sum(2))<16)&(np.sqrt(((lb-wallc)**2).sum(2))>16)
    diff&=(~likewall).astype(np.uint8)
# caixas onde não há extensão (ex.: WC visto pela porta), em píxeis do panorama: NOEXT="x0,y0,x1,y1;..."
for bx in filter(None,os.environ.get('NOEXT','').split(';')):
    x0,y0,x1,y1=map(int,bx.split(','));diff[y0:y1,x0:x1]=0
taken=np.zeros_like(diff)  # prioridade pela ordem dos componentes (o chão primeiro)
for p in parts:
    others=taken.copy()
    for q in parts:
        if q!=p: others|=cv2.erode(M[q],np.ones((5,5),np.uint8))
    for q in fixed: others|=F[q]
    ext=cv2.dilate(M[p],np.ones((45,45),np.uint8))&diff&(1-others)
    m=(M[p]|ext).astype(np.uint8)
    for q in fixed:
        if q.startswith('keep-'): m&=(1-F[q])  # zonas protegidas (tapete, móveis) nunca mudam
    k,lab,st,_=cv2.connectedComponentsWithStats(m,8)  # tirar manchas soltas pequenas
    for i in range(1,k):
        if st[i,cv2.CC_STAT_AREA]<400: m[lab==i]=0
    m=m*255
    taken|=(m>0).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8));m=cv2.GaussianBlur(m,(3,3),0)
    cv2.imwrite(f'{D}/{p}@{n}.png',m,[cv2.IMWRITE_PNG_COMPRESSION,9])
    print(p,n,'acrescentado',int(ext.sum()),'px')
