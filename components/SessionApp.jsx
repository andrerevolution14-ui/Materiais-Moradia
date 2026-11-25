'use client';
import {useCallback,useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {FLOORS,viewFor} from '../lib/views';
import {productColor} from '../lib/colors';
import '../app/session.css';
const Casa3D=dynamic(()=>import('./Casa3D'),{ssr:false});

export default function SessionApp({slug}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[room,setRoom]=useState(null),[focus,setFocus]=useState(null);
  const [colors,setColors]=useState({}),[floor,setFloor]=useState(null),[tab,setTab]=useState('materiais'),[text,setText]=useState(''),[sending,setSending]=useState(false),[msg,setMsg]=useState('');
  const load=useCallback(async()=>{
    const r=await fetch(`/api/s/${slug}`,{cache:'no-store'});const j=await r.json();
    if(!r.ok){setError(j.error||'Sessão não encontrada.');return;}
    setData(j);setRoom(old=>old||j.rooms[0]?.id);
  },[slug]);
  useEffect(()=>{load().catch(()=>setError('Não foi possível carregar a sessão.'));},[load]);
  useEffect(()=>{
    if(!data)return;let live=true;
    const all=new Map();data.rooms.forEach(r=>r.groups.forEach(g=>g.products.forEach(p=>all.set(p.id,p))));
    const need=new Set();data.rooms.forEach(r=>Object.values(r.selection).forEach(id=>id&&need.add(id)));if(focus)need.add(focus);
    need.forEach(id=>{if(colors[id]===undefined&&all.get(id))productColor(all.get(id)).then(hex=>{if(live)setColors(c=>c[id]!==undefined?c:{...c,[id]:hex||null});});});
    return()=>{live=false;};
  },[data,focus]);
  if(error)return <div className="page"><div className="wrap"><div className="box"><h2>Sessão indisponível</h2><p className="muted">{error}</p></div></div></div>;
  if(!data)return <div className="page"><div className="wrap"><p className="muted">A carregar…</p></div></div>;
  const current=data.rooms.find(r=>r.id===room)||data.rooms[0];
  async function choose(part,product){
    const next=current.selection[part]===product?null:product,before=data;
    setData(d=>({...d,rooms:d.rooms.map(r=>r.id===current.id?{...r,selection:{...r.selection,[part]:next,...(next===null?{}:{})}}:r)}));
    const res=await fetch(`/api/s/${slug}/selection`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({room:current.id,part,product:next})});
    if(!res.ok){setData(before);setMsg((await res.json()).error||'Não foi possível guardar.');}else setMsg('');
  }
  async function send(e){
    e.preventDefault();setSending(true);setMsg('');
    const res=await fetch(`/api/s/${slug}/requests`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({room:current.id,text})});
    const j=await res.json();setSending(false);
    if(!res.ok){setMsg(j.error||'Não foi possível enviar.');return;}
    setText('');setMsg('Pedido enviado. O seu consultor vai vê-lo.');load();
  }
  const shown=focus&&current.groups.flatMap(g=>g.products).find(p=>p.id===focus);
  const chosen=current.groups.map(g=>current.selection[g.part]&&g.products.find(p=>p.id===current.selection[g.part])).filter(Boolean);
  const preview=shown||chosen.at(-1),view=viewFor(current.id,floor),camera={position:view.position,target:view.target};
  const tints={};for(const r of data.rooms){for(const [part,id] of Object.entries(r.selection)){if(id&&colors[id])(tints[r.id]??={})[part]=colors[id];}}
  if(shown&&colors[shown.id])(tints[current.id]??={})[shown.part]=colors[shown.id];
  return <div className="page">
    <div className="bar"><a className="brand" href="/"><span>DOMAINE <i>XXV</i></span></a><div className="grow"><h1>{data.name}</h1></div>
      <div className="tabs" role="tablist">{[['materiais','Materiais'],['externas','Outras alterações'],['resumo','Resumo']].map(([id,l])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{l}</button>)}</div></div>
    <div className="wrap">
      {data.notes&&<div className="box"><p className="muted" style={{margin:0}}>{data.notes}</p></div>}
      <div className="tabs" style={{marginBottom:20}}>{data.rooms.map(r=><button key={r.id} aria-pressed={r.id===current.id} onClick={()=>{setRoom(r.id);setFocus(null);setFloor(null);}}>{r.label}</button>)}</div>
      {tab==='materiais'&&<div className="split">
        <div className="viewport"><Casa3D cutY={view.cut} focus={camera} tints={tints}/>
          <div className="floors">{Object.entries(FLOORS).map(([id,f])=><button key={id} aria-pressed={view.floor===id} onClick={()=>setFloor(id)}>{f.label}</button>)}</div>
          {preview&&<div className="cap" style={{maxWidth:300,right:'auto'}}>{preview.thumb&&<img src={preview.thumb} alt="" style={{position:'static',width:44,height:44,borderRadius:6,float:'left',marginRight:10}}/>}<b>{preview.title}</b><br/>{preview.brand}</div>}</div>
        <div>{msg&&<p className="err">{msg}</p>}{current.groups.map(g=><section className="group" key={g.part}><h3>{g.label}<small>{g.products.length} opções</small></h3>
          <div className="grid">{g.products.map(p=><button key={p.id} className="card" aria-pressed={current.selection[g.part]===p.id} onMouseEnter={()=>setFocus(p.id)} onFocus={()=>setFocus(p.id)} onMouseLeave={()=>setFocus(null)} onClick={()=>choose(g.part,p.id)}>
            {p.thumb&&<img src={p.thumb} alt="" loading="lazy"/>}<span><b>{p.title}</b><small>{p.brand}{p.color?` · ${p.color}`:''}</small></span></button>)}</div></section>)}</div></div>}
      {tab==='externas'&&<div className="split"><form className="box" onSubmit={send}><h2>Alterações fora do catálogo</h2>
        <p className="muted">Quer mudar algo que não está nas opções, como acrescentar uma divisória ou mover uma porta? Descreva o que pretende para a divisão <b>{current.label}</b>. O pedido é enviado tal como o escrever ao consultor, que responde depois.</p>
        <textarea value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="Ex.: nos arrumos, uma divisão em pladur para criar duas áreas." required/>
        <div className="row" style={{marginTop:12}}><button className="btn" disabled={sending||text.trim().length<5}>{sending?'A enviar…':'Enviar pedido'}</button>{msg&&<span className={/enviado/.test(msg)?'ok':'err'}>{msg}</span>}</div></form>
        <div><h3 className="muted" style={{margin:'0 0 10px'}}>OS SEUS PEDIDOS</h3><div className="list">{data.requests.length?data.requests.map(r=><div className="item" key={r.id} style={{display:'block'}}><div className="row"><span className="pill">{r.status}</span><small className="muted">{new Date(r.createdAt).toLocaleDateString('pt-PT')}</small></div><p style={{margin:'8px 0 0',fontSize:14}}>{r.text}</p></div>):<p className="muted">Ainda não enviou pedidos.</p>}</div></div></div>}
      {tab==='resumo'&&<div className="list">{data.rooms.map(r=><div className="box" key={r.id}><h2>{r.title}</h2><table className="t"><tbody>{r.groups.map(g=>{const p=g.products.find(x=>x.id===r.selection[g.part]);return <tr key={g.part}><td>{g.label}</td><td>{p?<><b>{p.title}</b> <small className="muted">{p.brand} · {p.ref}</small></>:<span className="muted">por escolher</span>}</td></tr>;})}</tbody></table></div>)}
        <p className="muted">As escolhas ficam guardadas neste endereço. Simulação visual: confirmar com amostras físicas.</p></div>}
    </div></div>;
}
