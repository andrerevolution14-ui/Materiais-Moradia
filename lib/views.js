/* Pisos e vistas por divisão (centímetros, sistema do modelo: x → direita, z → frente da moradia é z≈0). Posições de câmara a afinar visualmente. */
export const FLOORS = {
  exterior: { label: 'Exterior', cut: null, position: [1700, 1000, 900], target: [430, 250, -480] },
  rc: { label: 'R/C', cut: 262, position: [430, 1500, 300], target: [430, 0, -500] },
  p1: { label: 'Piso 1', cut: 545, position: [430, 1700, -100], target: [430, 300, -500] },
  sotao: { label: 'Sótão', cut: null, position: [430, 1700, 200], target: [430, 600, -500] },
};
export const ROOM_VIEW = {
  sala: { floor: 'rc', position: [330, 1000, -60], target: [330, 0, -420] },
  cozinha: { floor: 'rc', position: [200, 950, -560], target: [200, 0, -820] },
  'wc-servico': { floor: 'rc', position: [250, 800, -250], target: [250, 0, -575] },
  hall: { floor: 'p1', position: [440, 900, -100], target: [440, 300, -500] },
  suite: { floor: 'p1', position: [290, 1000, -380], target: [290, 300, -800] },
  'quarto-1': { floor: 'p1', position: [250, 900, 150], target: [250, 300, -220] },
  'quarto-2': { floor: 'p1', position: [700, 950, 250], target: [700, 300, -300] },
  'wc-suite': { floor: 'p1', position: [700, 900, -450], target: [700, 300, -830] },
  'wc-comum': { floor: 'p1', position: [700, 900, -300], target: [700, 300, -610] },
  sotao: { floor: 'sotao' }, exterior: { floor: 'exterior' },
};
export const viewFor = (roomId, floorOverride) => {
  const rv = ROOM_VIEW[roomId] || { floor: 'exterior' }, fl = FLOORS[floorOverride || rv.floor];
  const own = !floorOverride || floorOverride === rv.floor;
  return { floor: floorOverride || rv.floor, cut: fl.cut, position: (own && rv.position) || fl.position, target: (own && rv.target) || fl.target };
};
