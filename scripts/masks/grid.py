import sys,glob,os
from PIL import Image,ImageDraw
for f in sys.argv[1:]:
    im=Image.open(f).convert('RGB');W,H=im.size;s=1400/W;im=im.resize((1400,int(H*s)));d=ImageDraw.Draw(im)
    for x in range(0,W,100):
        X=x*s;d.line([(X,0),(X,im.height)],fill=(255,255,0) if x%500==0 else (255,255,255),width=1);d.text((X+2,2),str(x),fill=(255,255,0));d.text((X+2,im.height-12),str(x),fill=(255,255,0))
    for y in range(0,H,100):
        Y=y*s;d.line([(0,Y),(im.width,Y)],fill=(255,255,255),width=1);d.text((2,Y+2),str(y),fill=(255,255,0))
    im.save('/tmp/claude-0/m/g_'+os.path.basename(f).split('.')[0]+'.jpg',quality=82)
