/* Marca cada objeto do modelo 3D com a divisão (room) e o componente do catálogo (part) a que pertence.
   Uso: node scripts/tag-model.mjs entrada.glb saida.glb [--debug]
   A classificação usa o nome do objeto (ex.: "Banho V17 | lavatório oval branco") e, quando o nome não chega,
   a posição do objeto na planta (centímetros; R/C y<290, piso 1 y<590, sótão acima). */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds, flatten, join, dedup, prune, quantize} from '@gltf-transform/functions';
import {MeshoptDecoder, MeshoptEncoder} from 'meshoptimizer';
import {meshopt} from '@gltf-transform/functions';

const [input, output, flag] = process.argv.slice(2);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder});
const doc = await io.read(input);

const WET = new Set(['cozinha', 'wc-suite', 'wc-comum', 'wc-servico']), WC = new Set(['wc-suite', 'wc-comum', 'wc-servico']);
const norm = s => s.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/\d+$/, '').trim();

/* Caixas (x0,x1,z0,z1) por piso, a partir da planta. */
const BOXES = {
  R: [['cozinha', 25, 340, -1000, -630], ['sala', 340, 700, -1000, -630], ['sala', 0, 470, -380, 40], ['hall', 0, 470, -630, -380]],
  P: [['suite', 0, 540, -1000, -615], ['wc-suite', 538, 880, -1000, -725], ['wc-comum', 538, 880, -725, -505], ['hall', 0, 540, -615, -390],
      ['quarto-1', 0, 480, -390, 40], ['quarto-2', 480, 880, -505, 40], ['hall', 330, 540, -615, -355]],
};
const level = y => (y < 290 ? 'R' : y < 590 ? 'P' : 'S');
const roomByBox = (c) => {
  if (c.x < 0 || c.x > 880 || c.z > 45 || c.z < -1005) return 'exterior';
  const l = level(c.y); if (l === 'S') return 'sotao';
  for (const [r, x0, x1, z0, z1] of BOXES[l]) if (c.x >= x0 && c.x <= x1 && c.z >= z0 && c.z <= z1) return r;
  return null;
};
const ROOM_PREFIX = [
  [/^suite banho/, 'wc-suite'], [/^banho/, 'wc-comum'], [/^wc\b/, 'wc-servico'],
  [/^(cozinha|cerâmica cozinha|pavimento cozinha|indução|placa de indução|forno|mesa cozinha|misturadora)/, 'cozinha'],
  [/^(pavimento (estar|sala jantar)|jantar|aparador|cadeira|mesa sala|mesa de centro|móvel tv|tapete sala|estar|tv\b|cortina rc)/, 'sala'],
  [/^(pavimento hall|hall|escada|escadas)/, 'hall'],
  [/^quarto v20/, 'quarto-1'], [/^(quarto v14|cama v14|roupeiro v14|varanda v14)/, 'quarto-2'], [/^(suite v16|cama v16|roupeiro v16)/, 'suite'],
  [/^sótão/, 'sotao'],
  [/^(pátio|tardoz|muro|portão|acesso|anexo|telhado|cumeeira|caleira|chaminé|claraboia|guarda|vizinha|limite|volume|empena|cobertura|arrumos|exterior|divisão|remate|tubo|relvado|betão|v23|passagem)/, 'exterior'],
];
const roomOf = (name, c) => { for (const [re, r] of ROOM_PREFIX) if (re.test(name)) return r; return roomByBox(c); };

function partOf(name, room, mat) {
  if (room === 'exterior') return /pavimento|lajeta|pedra irregular/.test(name) ? 'floor-outdoor' : /janela|caixilho/.test(name) ? 'window' : null;
  if (/rodapé/.test(name)) return room === 'sotao' || !WET.has(room) ? 'skirting' : null;
  if (/^pintura mate/.test(mat) && !/porta|janela|caixilho|roupeiro|armário|puxador/.test(name)) return 'wall-paint';  // tudo o que é pintura mate (paredes e tetos)
  if (/teto|luz linear|difusor|foco|led|lâmpada/.test(name)) return null;
  if (/janela|caixilho|claraboia|moldura|peitoril|porta do jardim|vidro fixo/.test(name)) return 'window';
  if (room === 'cozinha') {
    if (/^cozinha (frente|módulo|coluna)/.test(name)) return 'cabinet-front';
    if (/puxador/.test(name)) return 'handle';
    if (/bancada/.test(name)) return 'worktop';
    if (/cuba|aro da cuba/.test(name)) return 'sink';
    if (/misturadora|bica/.test(name)) return 'kitchen-tap';
    if (/indução|placa|forno|micro/.test(name)) return 'appliance';
    if (/pavimento|cerâmica cozinha/.test(name)) return 'floor-wet';
    if (/parede cerâmica/.test(name)) return 'wall-tile';
  }
  if (WC.has(room)) {
    if (/pavimento duche|base duche/.test(name)) return 'shower-tray';
    if (/pavimento|laje pavimento|soleira|fundo juntas|junta/.test(name)) return 'floor-wet';
    if (/lavatório/.test(name)) return 'basin';
    if (/torneira|bica de parede/.test(name)) return 'basin-tap';
    if (/assento|tampa/.test(name)) return 'toilet-seat';
    if (/sanita/.test(name)) return 'toilet';
    if (/vidro único|painel fixo|porta do duche|aresta frontal vidro|fixação à parede do vidro/.test(name)) return 'shower-screen';
    if (/chuveiro|haste|disco chuva|comando|roseta teto|misturadora/.test(name)) return 'shower-tap';
    if (/móvel suspenso|tampo madeira|porta lisa/.test(name)) return 'bath-furniture';
    if (/ligação|válvula|ralo|doseador|gancho|placa preta descarga|tecla/.test(name)) return 'bath-fitting';
    if (/parede|retorno|nicho|verga|painel|espelho/.test(name) && !/espelho/.test(name)) return 'wall-tile';
    if (/^(banho|suite banho|wc) ?v?\d* ?\|? ?(parede|retorno|nicho|verga)/.test(name)) return 'wall-tile';
  }
  if (/roupeiro|armário/.test(name)) return /puxador/.test(name) ? 'wardrobe-handle' : 'wardrobe';
  if (/porta/.test(name) && !/portão/.test(name)) return /puxador|maçaneta|fechadura/.test(name) ? 'door-handle' : 'interior-door';
  if (/pavimento|régua|fundo juntas|base juntas|soleira/.test(name)) return WET.has(room) ? 'floor-wet' : 'floor-dry';
  if (/^pintura mate/.test(mat) || /parede|retorno|ombreira|verga|canto|frente contínua|lateral|topo|sanca|aba /.test(name)) return 'wall-paint';
  return null;
}

const stats = {}; const unplaced = [];
for (const n of doc.getRoot().listNodes()) {
  const mesh = n.getMesh(); if (!mesh) continue;
  const b = getBounds(n), c = {x: (b.min[0] + b.max[0]) / 2, y: (b.min[1] + b.max[1]) / 2, z: (b.min[2] + b.max[2]) / 2};
  const name = norm(n.getName()), mat = (mesh.listPrimitives()[0]?.getMaterial()?.getName() || '').toLowerCase();
  const room = roomOf(name, c); if (!room) { unplaced.push(name); continue; }
  const part = partOf(name, room, mat);
  if (part) { n.setExtras({...(n.getExtras() || {}), room, part}); const k = `${room}/${part}`; stats[k] = (stats[k] || 0) + 1; }
  else n.setExtras({...(n.getExtras() || {}), room});
}
for (const [k, v] of Object.entries(stats).sort()) console.log(String(v).padStart(4), k);
console.log('sem divisão:', unplaced.length, unplaced.slice(0, 12));

if (flag === '--debug') {  // cores por componente para verificar visualmente
  const hue = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const hsl = (h) => { const f = n => { const k = (n + h / 30) % 12; return 0.55 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4), 1]; };
  const cache = {};
  for (const n of doc.getRoot().listNodes()) {
    const m = n.getMesh(); if (!m) continue; const e = n.getExtras() || {}; const key = e.part ? `${e.room}/${e.part}` : e.room ? `${e.room}/-` : '?';
    cache[key] ??= doc.createMaterial(key).setBaseColorFactor(e.part ? hsl(hue(key)) : [0.85, 0.85, 0.85, 1]).setRoughnessFactor(1).setMetallicFactor(0);
    m.listPrimitives().forEach(p => p.setMaterial(cache[key]));
  }
}
/* Aligeirar: funde os objetos da mesma divisão/componente (e material) num só, quantiza e comprime.
   As marcas room/part ficam no nó-pai de cada grupo; o Casa3D procura-as subindo na hierarquia. */
const scene = doc.getRoot().listScenes()[0], groups = new Map();
await doc.transform(flatten());
for (const n of doc.getRoot().listNodes()) {
  if (!n.getMesh()) continue;
  const e = n.getExtras() || {}, k = `${e.room || '-'}|${e.part || '-'}`;
  let p = groups.get(k);
  if (!p) { p = doc.createNode('g:' + k).setExtras({room: e.room, part: e.part}); scene.addChild(p); groups.set(k, p); }
  p.addChild(n);
}
await doc.transform(join({keepNamed: false}), dedup(), prune(), quantize({quantizePosition: 14, quantizeNormal: 8}), meshopt({encoder: MeshoptEncoder, level: 'high'}));
await io.write(output, doc);
