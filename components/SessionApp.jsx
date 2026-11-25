'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import Pano from './Pano';
import {SCENES, sceneById, FLOOR_ORDER, panoUrl, thumbUrl, maskUrl} from '../lib/scenes';
import MASKS from '../data/masks.json';
import {compose, loadImage} from '../lib/panoCompose';
import {productColor} from '../lib/colors';
const Casa3D = dynamic(() => import('./Casa3D'), {ssr: false});

const baseId = id => id && id.split('#')[0];
const customHex = id => id && id.includes('#') ? '#' + id.split('#')[1] : null;
const label = id => { const s = sceneById[id]; return s ? `${s.title}${s.detail && s.title !== s.detail ? ' · ' + s.detail : ''}` : id; };

/* Experiência do cliente: a moradia em 360°, em ecrã inteiro, com o catálogo dentro da vista.
   As escolhas são por divisão e ficam guardadas na sessão: ao mudar de vista, tudo o que foi escolhido mantém-se aplicado. */
export default function SessionApp({slug}) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const [sceneId, setSceneId] = useState(() => (typeof location !== 'undefined' && sceneById[location.hash.slice(1)]) ? location.hash.slice(1) : 'sala');
  const [panel, setPanel] = useState(() => typeof innerWidth !== 'undefined' && innerWidth < 760 ? null : 'materiais'), [focus, setFocus] = useState(null), [open, setOpen] = useState(null), [colors, setColors] = useState({});
  const [frame, setFrame] = useState({canvas: null, v: 0}), [busy, setBusy] = useState(true), [msg, setMsg] = useState('');
  const canvasRef = useRef(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/s/${slug}`, {cache: 'no-store'}); const j = await r.json();
    if (!r.ok) { setError(j.error || 'Sessão não encontrada.'); return; }
    setData(j);
  }, [slug]);
  useEffect(() => { load().catch(() => setError('Não foi possível carregar a sessão.')); }, [load]);
  useEffect(() => { if (location.hash.slice(1) !== sceneId) history.replaceState(null, '', '#' + sceneId); }, [sceneId]);
  useEffect(() => { const on = () => { const h = location.hash.slice(1); if (sceneById[h]) { setSceneId(h); setFocus(null); } }; addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);

  const scene = sceneById[sceneId], room = data?.rooms.find(r => r.id === scene.room);
  const products = useMemo(() => { const m = new Map(); data?.rooms.forEach(r => r.groups.forEach(g => g.products.forEach(p => m.set(p.id, p)))); return m; }, [data]);

  /* Cor de cada produto escolhido (ou em pré-visualização). */
  useEffect(() => {
    if (!data) return; let live = true;
    const need = new Set(); data.rooms.forEach(r => Object.values(r.selection).forEach(id => id && !customHex(id) && need.add(id))); if (focus) need.add(focus);
    need.forEach(id => { if (colors[id] === undefined && products.get(id)) productColor(products.get(id)).then(hex => { if (live) setColors(c => c[id] !== undefined ? c : {...c, [id]: hex || null}); }); });
    return () => { live = false; };
  }, [data, focus, products]);

  /* Composição da vista atual com as escolhas da divisão (e a pré-visualização ao passar o rato). */
  const layers = useMemo(() => {
    if (!data) return [];
    return (MASKS[sceneId] || []).map(k => {
      const [rid, part] = k.includes('/') ? k.split('/') : [scene.room, k], r = data.rooms.find(x => x.id === rid); if (!r) return null;
      let id = r.selection[part]; if (rid === scene.room && focus && products.get(focus)?.part === part) id = focus;
      if (!id) return null;
      const hex = customHex(id) || colors[id]; return hex ? {mask: maskUrl(sceneId, k.replace('/', '--')), hex} : null;
    }).filter(Boolean);
  }, [data, focus, colors, sceneId, products]);
  const key = sceneId + JSON.stringify(layers);
  useEffect(() => {
    let live = true; setBusy(true);
    canvasRef.current ||= document.createElement('canvas');
    compose(panoUrl(sceneId), layers, canvasRef.current).then(c => { if (live && c) { setFrame(f => ({canvas: c, v: f.v + 1})); setBusy(false); } });
    SCENES.find(s => s.id === sceneId)?.hotspots.forEach(h => loadImage(panoUrl(h.target)));  // pré-carregar vistas vizinhas
    return () => { live = false; };
  }, [key]);

  async function choose(part, product, force) {
    const cur = room.selection[part];
    const next = !force && baseId(cur) === product ? null : (!force && product === 'paint-custom' ? 'paint-custom#d9d2c5' : product), before = data;
    setData(d => ({...d, rooms: d.rooms.map(r => r.id === room.id ? {...r, selection: {...r.selection, [part]: next}} : r)}));
    const res = await fetch(`/api/s/${slug}/selection`, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({room: room.id, part, product: next})});
    if (!res.ok) { setData(before); setMsg((await res.json()).error || 'Não foi possível guardar.'); } else setMsg('');
  }

  if (error) return <Center><h1>Sessão indisponível</h1><p>{error}</p></Center>;
  if (!data) return <Center><div className="spinner"/></Center>;
  const chosenCount = data.rooms.reduce((n, r) => n + Object.values(r.selection).filter(Boolean).length, 0);
  const masked = new Set((MASKS[sceneId] || []).filter(k => !k.includes('/') || k.startsWith(scene.room + '/')).map(k => k.split('/').pop()));

  return <div className="experience">
    <Pano source={frame.canvas} version={frame.v} view={scene.view} hotspots={scene.hotspots} onHotspot={id => { setSceneId(id); setFocus(null); }} labelFor={label} key={sceneId}/>
    {busy && <div className="veil"><div className="spinner"/></div>}

    <header className="topbar">
      <a className="mark" href="/">DOMAINE <i>XXV</i></a>
      <div className="where"><small>{scene.floor}</small><b>{scene.title}</b>{scene.detail && <span>{scene.detail}</span>}</div>
      <nav className="actions">
        {[['vistas', 'Vistas'], ['materiais', 'Materiais'], ['resumo', 'Resumo'], ['pedidos', 'Pedidos'], ['modelo', 'Modelo 3D']].map(([id, t]) =>
          <button key={id} aria-pressed={panel === id} onClick={() => setPanel(p => p === id ? null : id)}>{t}</button>)}
      </nav>
    </header>

    {panel === 'materiais' && <aside className="drawer">
      <div className="drawer-head"><div><small>Materiais</small><h2>{room?.title || room?.label || 'Exterior'}</h2></div><button className="x" onClick={() => setPanel(null)} aria-label="Fechar">×</button></div>
      {msg && <p className="err">{msg}</p>}
      {!room ? <p className="muted">Esta vista não tem materiais para escolher.</p> : <div className="groups">{room.groups.map(g => {
        const sel = room.selection[g.part], chosen = products.get(baseId(sel)), isOpen = open === g.part, shown = masked.has(g.part);
        return <section key={g.part} className={'group' + (isOpen ? ' open' : '')}>
          <button className="group-head" onClick={() => setOpen(isOpen ? null : g.part)} aria-expanded={isOpen}>
            <span className="dot" style={{background: customHex(sel) || colors[sel] || 'transparent'}}/>
            <span className="gl"><b>{g.label}</b><small>{chosen ? chosen.title : 'Por escolher'}{!shown ? ' · não visível nesta vista' : ''}</small></span><span className="chev">{isOpen ? '−' : '+'}</span>
          </button>
          {isOpen && <div className="options">{g.products.map(p => <button key={p.id} className="option" aria-pressed={baseId(sel) === p.id}
              onMouseEnter={() => setFocus(p.id)} onMouseLeave={() => setFocus(null)} onClick={() => choose(g.part, p.id)}>
              {p.thumb ? <img src={p.thumb} alt="" loading="lazy"/> : <span className="noimg"/>}<span><b>{p.title}</b><small>{p.brand}{p.color ? ` · ${p.color}` : ''}</small></span></button>)}
            {g.products.some(p => p.id === 'paint-custom') && <label className="picker">Cor à escolha<input type="color" value={customHex(sel) || '#d9d2c5'} onChange={e => choose(g.part, 'paint-custom#' + e.target.value.slice(1), true)}/></label>}
          </div>}
        </section>;
      })}</div>}
    </aside>}

    {panel === 'vistas' && <aside className="drawer wide">
      <div className="drawer-head"><div><small>A moradia</small><h2>Vistas</h2></div><button className="x" onClick={() => setPanel(null)} aria-label="Fechar">×</button></div>
      {FLOOR_ORDER.map(f => <section key={f} className="floor"><h3>{f}</h3><div className="thumbs">{SCENES.filter(s => s.floor === f).map(s =>
        <button key={s.id} aria-pressed={s.id === sceneId} onClick={() => { setSceneId(s.id); setFocus(null); }}><img src={thumbUrl(s.id)} alt="" loading="lazy"/><span>{s.title}<small>{s.detail}</small></span></button>)}</div></section>)}
    </aside>}

    {panel === 'resumo' && <Summary data={data} products={products} onClose={() => setPanel(null)}/>}
    {panel === 'pedidos' && <Requests data={data} slug={slug} room={room} onSent={load} onClose={() => setPanel(null)}/>}
    {panel === 'modelo' && <div className="sheet">
      <div className="drawer-head"><div><small>Informativo</small><h2>Modelo 3D</h2></div><button className="x" onClick={() => setPanel(null)} aria-label="Fechar">×</button></div>
      <div className="model"><Model data={data} colors={colors}/></div>
      <p className="muted">Vista técnica da moradia com as cores das suas escolhas. Não é um render: serve para ver a casa no conjunto.</p>
    </div>}

    <footer className="status"><span>{chosenCount === 1 ? '1 escolha guardada' : `${chosenCount} escolhas guardadas`}</span><span className="hint">Arraste para olhar · clique nos círculos para mudar de divisão</span></footer>
  </div>;
}

function Center({children}) { return <div className="center">{children}</div>; }

function Summary({data, products, onClose}) {
  return <div className="sheet">
    <div className="drawer-head"><div><small>A sua seleção</small><h2>Resumo</h2></div><button className="x" onClick={onClose} aria-label="Fechar">×</button></div>
    <div className="summary">{data.rooms.map(r => <section key={r.id}><h3>{r.title}</h3><dl>{r.groups.map(g => { const id = r.selection[g.part], p = products.get(baseId(id)); return <div key={g.part}><dt>{g.label}</dt><dd>{p ? <>{p.title}{customHex(id) && <> · {customHex(id)}</>}<small>{p.brand}{p.ref ? ' · ' + p.ref : ''}</small></> : <span className="muted">Por escolher</span>}</dd></div>; })}</dl></section>)}</div>
    <p className="muted">As escolhas ficam guardadas neste endereço. Simulação visual: confirme sempre com as amostras físicas.</p>
  </div>;
}

function Requests({data, slug, room, onSent, onClose}) {
  const [text, setText] = useState(''), [sending, setSending] = useState(false), [msg, setMsg] = useState('');
  async function send(e) {
    e.preventDefault(); setSending(true); setMsg('');
    const res = await fetch(`/api/s/${slug}/requests`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({room: room?.id || 'exterior', text})});
    const j = await res.json(); setSending(false);
    if (!res.ok) { setMsg(j.error || 'Não foi possível enviar.'); return; }
    setText(''); setMsg('Pedido enviado ao seu consultor.'); onSent();
  }
  return <div className="sheet narrow">
    <div className="drawer-head"><div><small>Fora do catálogo</small><h2>Pedidos de alteração</h2></div><button className="x" onClick={onClose} aria-label="Fechar">×</button></div>
    <form onSubmit={send}><p className="muted">Descreva o que pretende mudar{room ? <> em <b>{room.label}</b></> : ''}: uma divisória, mover uma porta, outro acabamento. O pedido segue tal como o escrever.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Ex.: no sótão, uma divisória em pladur para criar um escritório." required/>
      <div className="row"><button className="btn" disabled={sending || text.trim().length < 5}>{sending ? 'A enviar…' : 'Enviar pedido'}</button>{msg && <span className={/enviado/.test(msg) ? 'ok' : 'err'}>{msg}</span>}</div></form>
    <div className="reqs">{data.requests.length ? data.requests.map(r => <div key={r.id}><span className="pill">{r.status}</span><small>{new Date(r.createdAt).toLocaleDateString('pt-PT')}</small><p>{r.text}</p></div>) : <p className="muted">Ainda não enviou pedidos.</p>}</div>
  </div>;
}

function Model({data, colors}) {
  const tints = {}; for (const r of data.rooms) for (const [part, id] of Object.entries(r.selection)) { const hex = id && (customHex(id) || colors[id]); if (hex) (tints[r.id] ??= {})[part] = hex; }
  return <Casa3D tints={tints} focus={{position: [1700, 1000, 900], target: [430, 250, -480]}}/>;
}
