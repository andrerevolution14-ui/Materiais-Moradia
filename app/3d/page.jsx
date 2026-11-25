'use client';
import {useSearchParams} from 'next/navigation';
import {Suspense,useMemo} from 'react';
import Casa3D from '../../components/Casa3D';
function View(){
  const q=useSearchParams();const n=k=>q.get(k)==null?null:Number(q.get(k));
  const focus=useMemo(()=>q.get('cam')?{position:q.get('cam').split(',').map(Number),target:(q.get('look')||'430,250,-480').split(',').map(Number)}:null,[q]);
  return <div style={{position:'fixed',inset:0}}><Casa3D cutY={n('cut')} focus={focus} src={q.get('m')||undefined}/></div>;
}
export default function Page(){return <Suspense><View/></Suspense>;}
