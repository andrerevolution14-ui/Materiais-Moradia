'use client';
import {useCallback,useEffect,useState} from 'react';
import '../app/session.css';
const api=async(url,opt)=>{const r=await fetch(url,{cache:'no-store',...opt,headers:{'content-type':'application/json'},body:opt?.body&&JSON.stringify(opt.body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Erro'),{status:r.status});return j;};
const eur=n=>n==null?'—':n.toLocaleString('pt-PT',{style:'currency',currency:'EUR'});

export default function Admin(){
  const [auth,setAuth]=useState(null),[sessions,setSessions]=useState([]),[open,setOpen]=useState(null),[err,setErr]=useState('');
  const load=useCallback(async()=>{try{setSessions((await api('/api/admin/sessions')).sessions);setAuth(true);setErr('');}catch(e){setAuth(false);setErr(e.status===401?'':(e.message||'Erro ao carregar. Verifique a base de dados (DATABASE_URL).'));}},[]);
  useEffect(()=>{load();},[load]);
  if(auth===null)return <div className="page"><div className="wrap"><p className="muted">A carregar…</p></div></div>;
  if(!auth)return <Login onDone={load} err={err}/>;
  return <div className="page"><div className="bar"><b style={{letterSpacing:'.18em'}}>ATELIER · ADMIN</b><span className="grow"/>
    {open&&<button className="btn ghost" onClick={()=>{setOpen(null);load();}}>← Sessões</button>}
    <button className="btn ghost" onClick={async()=>{await api('/api/admin/login',{method:'POST',body:{logout:true}});setAuth(false);}}>Sair</button></div>
    <div className="wrap">{open?<Detail slug={open}/>:<List sessions={sessions} onOpen={setOpen} reload={load}/>}</div></div>;
}
function Login({onDone,err}){
  const [pw,setPw]=useState(''),[e,setE]=useState(err);
  return <div className="page"><div className="wrap" style={{maxWidth:420}}><form className="box" onSubmit={async ev=>{ev.preventDefault();try{await api('/api/admin/login',{method:'POST',body:{password:pw}});onDone();}catch(x){setE(x.message);}}}>
    <h2>Administração</h2><p className="muted">Acesso reservado.</p><input type="password" value={pw} onChange={x=>setPw(x.target.value)} placeholder="Palavra-passe" autoFocus/><p className="err">{e||err}</p><button className="btn">Entrar</button></form></div></div>;
}
function List({sessions,onOpen,reload}){
  const [name,setName]=useState(''),[err,setErr]=useState('');
  return <><form className="box" onSubmit={async e=>{e.preventDefault();setErr('');try{const r=await api('/api/admin/sessions',{method:'POST',body:{name}});setName('');await reload();onOpen(r.slug);}catch(x){setErr(x.message);}}}>
    <h2>Nova sessão de cliente</h2><div className="row"><input type="text" style={{flex:1,minWidth:200}} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do cliente (ex.: Bruno)"/><button className="btn" disabled={!name.trim()}>Criar</button></div><p className="err">{err}</p></form>
    <div className="list">{sessions.map(s=><div className="item" key={s.slug}><div><b>{s.name}</b><div className="muted">/{s.slug} · {s.chosen} escolhas{s.openRequests?<> · <span className="pill new">{s.openRequests} pedido(s) novo(s)</span></>:null}</div></div>
      <div className="row"><button className="btn ghost" onClick={()=>navigator.clipboard?.writeText(`${location.origin}/${s.slug}`)}>Copiar link</button><button className="btn" onClick={()=>onOpen(s.slug)}>Abrir</button></div></div>)}{!sessions.length&&<p className="muted">Ainda não há sessões.</p>}</div></>;
}
function Detail({slug}){
  const [d,setD]=useState(null),[room,setRoom]=useState(null),[err,setErr]=useState('');
  const load=useCallback(async()=>{const j=await api(`/api/admin/sessions/${slug}`);setD(j);setRoom(r=>r||j.rooms[0]?.id);},[slug]);
  useEffect(()=>{load().catch(e=>setErr(e.message));},[load]);
  if(!d)return <p className="err">{err||'A carregar…'}</p>;
  const cur=d.rooms.find(r=>r.id===room)||d.rooms[0];
  const toggle=async(product,on)=>{await api(`/api/admin/sessions/${slug}`,{method:'PATCH',body:{allow:{room:cur.id,product,on}}});load();};
  return <><div className="row" style={{justifyContent:'space-between'}}><div><h2 style={{margin:0,fontFamily:'var(--serif)',fontWeight:400}}>{d.name}</h2><p className="muted" style={{margin:'4px 0 0'}}>{typeof location!=='undefined'&&location.origin}/{slug}</p></div>
    <button className="btn ghost" onClick={async()=>{if(confirm('Apagar esta sessão e os seus pedidos?')){await api(`/api/admin/sessions/${slug}`,{method:'DELETE'});location.reload();}}}>Apagar</button></div>
    <div className="box" style={{marginTop:16}}><h2>Pedidos de alteração externa</h2>{d.requests.length?d.requests.map(r=><Req key={r.id} r={r} reload={load}/>):<p className="muted">Sem pedidos.</p>}</div>
    <div className="tabs" style={{margin:'20px 0'}}>{d.rooms.map(r=><button key={r.id} aria-pressed={r.id===cur.id} onClick={()=>setRoom(r.id)}>{r.label}</button>)}</div>
    <p className="muted">Catálogo do cliente: ative os materiais que ele pode ver. Os preços só aparecem aqui. Verde = dentro do plafond unitário; vermelho = acima (extra de obra).</p>
    {cur.groups.map(g=><section className="group" key={g.part}><h3>{g.label}<small>selecionado: {g.products.find(p=>p.id===cur.selection[g.part])?.title||'—'}</small></h3><div className="grid">{g.products.map(p=>
      <button key={p.id} className={`card${p.allowed?'':' off'}`} aria-pressed={p.allowed} onClick={()=>toggle(p.id,!p.allowed)}>{p.thumb&&<img src={p.thumb} alt="" loading="lazy"/>}
        <span><b>{p.title}</b><small>{p.brand} · {eur(p.price)}/{p.unit}</small>{p.limit!=null&&<small style={{display:'block',color:p.delta>0?'#9b2c2c':'#2f6b3a'}}>plafond {eur(p.limit)}{p.delta>0?` · +${eur(p.delta)}`:''}</small>}{p.extra&&<em className="tag">acima do plafond</em>}{!p.available&&<em className="tag">indisponível</em>}</span></button>)}</div></section>)}</>;
}
function Req({r,reload}){
  const [note,setNote]=useState(r.adminNote||'');
  const set=async p=>{await api(`/api/admin/requests/${r.id}`,{method:'PATCH',body:p});reload();};
  return <div style={{borderTop:'1px solid var(--line)',padding:'12px 0'}}><div className="row"><span className={`pill${r.status==='novo'?' new':''}`}>{r.status}</span><small className="muted">{r.room||'geral'} · {new Date(r.createdAt).toLocaleString('pt-PT')}</small></div>
    <p style={{margin:'8px 0'}}>{r.text}</p>
    <div className="row"><select value={r.status} onChange={e=>set({status:e.target.value})}>{['novo','em análise','aprovado','recusado'].map(s=><option key={s}>{s}</option>)}</select><input type="text" style={{flex:1,minWidth:180}} value={note} onChange={e=>setNote(e.target.value)} onBlur={()=>note!==r.adminNote&&set({adminNote:note})} placeholder="Nota interna"/></div></div>;
}
