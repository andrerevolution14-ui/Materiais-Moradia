'use client';
import {useState} from 'react';

/* Entrada: o cliente escreve o endereço pessoal que recebeu do consultor. */
export default function Home() {
  const [code, setCode] = useState('');
  const go = e => { e.preventDefault(); const s = code.trim().toLowerCase().replace(/^.*\//, '').replace(/[^a-z0-9-]/g, ''); if (s) location.href = '/' + s; };
  return <div className="login">
    <div className="login-art" style={{backgroundImage: 'url(/pano/sala.webp)'}}><div><small>Oliveirinha · Aveiro</small><p>A sua casa, ao seu gosto.</p></div></div>
    <form className="login-form" onSubmit={go}>
      <a className="mark" href="/">DOMAINE <i>XXV</i></a>
      <div><small className="eyebrow">Acabamentos</small><h1>Escolha os materiais da sua moradia</h1>
        <p className="muted">Percorra a casa em 360°, divisão a divisão, e veja cada pavimento, tinta e cerâmica aplicados no lugar. As suas escolhas ficam guardadas.</p></div>
      <label className="field"><span>O seu endereço pessoal</span><input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="ex.: bruno" autoCapitalize="none" autoComplete="off"/></label>
      <button className="btn big" disabled={!code.trim()}>Entrar</button>
      <small className="muted">Não tem endereço? Peça-o ao seu consultor. · <a href="/admin">Área do consultor</a></small>
    </form>
  </div>;
}
