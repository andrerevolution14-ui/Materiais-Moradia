#!/bin/bash
# uso: run.sh cena  → gera máscaras em public/pano/masks/<cena>/ e atualiza data/masks.json
set -e; S=$1; R=$(pwd); T=${TMPDIR:-/tmp}/masks_$S
rm -rf $T; ${PYTHON:-python3} scripts/masks/sam.py $R/public/pano/$S.webp scripts/masks/s_$S.json $T ${TMPDIR:-/tmp}/ov_$S.jpg 2>&1 | grep "%" | sed "s/^/$S: /"
mkdir -p $R/public/pano/masks/$S; rm -f $R/public/pano/masks/$S/*.png
python3 - $S $T $R <<'PY'
import sys,os,json,shutil,subprocess
S,T,R=sys.argv[1:4];keys=[]
for root,_,files in os.walk(T):
  for f in files:
    if f.endswith('.png'):
      rel=os.path.relpath(os.path.join(root,f),T)[:-4]; keys.append(rel)
      shutil.copy(os.path.join(root,f),f"{R}/public/pano/masks/{S}/{rel.replace('/','--')}.png")
m=json.load(open(f'{R}/data/masks.json'));m[S]=sorted(keys);json.dump(m,open(f'{R}/data/masks.json','w'),indent=1,sort_keys=True)
PY
