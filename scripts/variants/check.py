# uso: check.py base.png render.png masks_dir out.jpg → mede alinhamento fora das máscaras e gera comparação
import sys,glob,os,numpy as np,cv2
b=cv2.imread(sys.argv[1]);r=cv2.imread(sys.argv[2]);H,W=b.shape[:2]
if r.shape[:2]!=(H,W): print('tamanho diferente',r.shape[:2],'-> redimensiono'); r=cv2.resize(r,(W,H),interpolation=cv2.INTER_AREA)
m=np.zeros((H,W),np.uint8)
for f in glob.glob(sys.argv[3]+'/*.png'): m|=(cv2.imread(f,0)>40).astype(np.uint8)
out=(cv2.dilate(m,np.ones((25,25),np.uint8))==0)
gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32);gr=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32)
print('diferença média fora das zonas editáveis:',round(float(np.abs(gb-gr)[out].mean()),1),'(0 = idêntico)')
# deslocamento global por correlação de fase
sh,resp=cv2.phaseCorrelate(gb,gr);print('deslocamento estimado (px):',[round(s,1) for s in sh])
cv2.imwrite(sys.argv[4],cv2.resize(np.vstack([b,r]),(1280,1280)),[cv2.IMWRITE_JPEG_QUALITY,85])
