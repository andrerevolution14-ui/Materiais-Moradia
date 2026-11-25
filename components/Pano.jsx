'use client';
import {useEffect, useRef, useState} from 'react';

/* Visualizador 360° equiretangular em WebGL.
   Convenção (igual à visita): yaw 0 = centro da imagem, positivo para a direita; pitch positivo para cima; ângulos em radianos.
   `source` é uma imagem ou um canvas (a composição com os materiais); `version` força o reenvio da textura quando o canvas muda. */
const VS = `attribute vec2 p;varying vec2 s;void main(){s=p;gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;varying vec2 s;uniform sampler2D t;uniform float yaw,pitch,tx,ty;
void main(){vec3 r=vec3(s.x*tx,s.y*ty,1.);float cp=cos(pitch),sp=sin(pitch),cy=cos(yaw),sy=sin(yaw);
float l=cp*r.y+sp*r.z,h=-sp*r.y+cp*r.z,c=cy*r.x+sy*h,f=-sy*r.x+cy*h;float n=length(vec3(c,l,f));
vec2 uv=vec2(fract(.5+atan(c,f)/6.2831853),.5-asin(clamp(l/n,-1.,1.))/3.1415927);gl_FragColor=texture2D(t,uv);}`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function project(view, w, h, yaw, pitch) {
  const tx = Math.tan(view.fov * Math.PI / 360) * Math.min(1, w / h / 1.4473684), ty = tx * h / w;
  const c = Math.sin(yaw) * Math.cos(pitch), l = Math.sin(pitch), f = Math.cos(yaw) * Math.cos(pitch);
  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  const rx = cy * c - sy * f, hh = sy * c + cy * f, ry = cp * l - sp * hh, rz = sp * l + cp * hh;
  if (rz <= 0.05) return null;
  return {x: (0.5 + 0.5 * rx / rz / tx) * w, y: (0.5 - 0.5 * ry / rz / ty) * h};
}

export default function Pano({source, version = 0, view: initial, hotspots = [], onHotspot, labelFor, className, children}) {
  const host = useRef(null), canvas = useRef(null), gl = useRef(null), view = useRef({yaw: 0, pitch: 0, fov: 100}), raf = useRef(0);
  const [, tick] = useState(0), [size, setSize] = useState([1, 1]);
  const redraw = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => { draw(); tick(n => n + 1); }); };

  function draw() {
    const g = gl.current, c = canvas.current; if (!g || !c) return;
    const w = c.width, h = c.height, v = view.current;
    const tx = Math.tan(v.fov * Math.PI / 360) * Math.min(1, w / h / 1.4473684);
    g.viewport(0, 0, w, h); g.uniform1f(g.u.yaw, v.yaw); g.uniform1f(g.u.pitch, v.pitch); g.uniform1f(g.u.tx, tx); g.uniform1f(g.u.ty, tx * h / w);
    g.drawArrays(g.TRIANGLES, 0, 6);
  }

  useEffect(() => {
    const c = canvas.current, g = c.getContext('webgl', {antialias: false, preserveDrawingBuffer: true}); if (!g) return;
    const sh = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); return s; };
    const pr = g.createProgram(); g.attachShader(pr, sh(g.VERTEX_SHADER, VS)); g.attachShader(pr, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(pr); g.useProgram(pr);
    const b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), g.STATIC_DRAW);
    const a = g.getAttribLocation(pr, 'p'); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
    g.u = Object.fromEntries(['yaw', 'pitch', 'tx', 'ty'].map(k => [k, g.getUniformLocation(pr, k)]));
    const tex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tex);
    [[g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE], [g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR]].forEach(([k, v]) => g.texParameteri(g.TEXTURE_2D, k, v));
    gl.current = g;
    const resize = () => { const r = host.current.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); c.width = Math.max(1, r.width * d | 0); c.height = Math.max(1, r.height * d | 0); setSize([r.width, r.height]); redraw(); };
    const ro = new ResizeObserver(resize); ro.observe(host.current); resize();
    return () => { ro.disconnect(); cancelAnimationFrame(raf.current); gl.current = null; };
  }, []);

  useEffect(() => { const g = gl.current; if (!g || !source) return; g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, source); redraw(); }, [source, version]);
  useEffect(() => { if (initial) { view.current = {...initial}; redraw(); } }, [initial]);

  /* Arrastar para olhar, roda e pinça para aproximar, setas no teclado. */
  useEffect(() => {
    const el = canvas.current, pts = new Map(); let last = null, pinch = null;
    const look = (dx, dy) => { const v = view.current, k = v.fov / 100 * 0.005; v.yaw = wrap(v.yaw - dx * k); v.pitch = clamp(v.pitch + dy * k, -1.3, 1.3); redraw(); };
    const zoom = f => { const v = view.current; v.fov = clamp(v.fov * f, 45, 118); redraw(); };
    const down = e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } };
    const move = e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoom(pinch / d); pinch = d; return; }
      look(e.clientX - last[0], e.clientY - last[1]); last = [e.clientX, e.clientY];
    };
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; const p = [...pts.values()][0]; last = p || null; };
    const wheel = e => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.001)); };
    const key = e => { const m = {ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -30], ArrowDown: [0, 30]}[e.key]; if (m) { e.preventDefault(); look(...m); } else if (e.key === '+' || e.key === '=') zoom(0.9); else if (e.key === '-') zoom(1.1); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('wheel', wheel, {passive: false}); el.addEventListener('keydown', key);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); el.removeEventListener('keydown', key); };
  }, []);

  const [w, h] = size;
  return <div ref={host} className={'pano ' + (className || '')}>
    <canvas ref={canvas} tabIndex={0} aria-label="Vista 360°: arraste para olhar em redor"/>
    <div className="hotspots">{hotspots.map(s => { const p = project(view.current, w, h, s.yaw, s.pitch); return p && <button key={s.target} className="hotspot" style={{left: p.x, top: p.y}} onClick={() => onHotspot?.(s.target)} aria-label={labelFor?.(s.target) || 'Ir'}><i/><span>{labelFor?.(s.target)}</span></button>; })}</div>
    {children}
  </div>;
}
