/* Pisos e vistas por divisão (centímetros, sistema do modelo: x → direita, z → frente da moradia é z≈0). Posições de câmara a afinar visualmente. */
export const FLOORS = {
  exterior: { label: 'Exterior', cut: null, position: [1700, 1000, 900], target: [430, 250, -480] },
  rc: { label: 'R/C', cut: 262, position: [430, 1500, 300], target: [430, 0, -500] },
  p1: { label: 'Piso 1', cut: 545, position: [430, 1700, -100], target: [430, 300, -500] },
  sotao: { label: 'Sótão', cut: null, position: [430, 1700, 200], target: [430, 600, -500] },
};
export const ROOM_VIEW = {
  sala: { floor: 'rc', position: [330, 950, -170], target: [330, 0, -420] },
  cozinha: { floor: 'rc', position: [182, 950, -565], target: [182, 0, -815] },
  'wc-servico': { floor: 'rc', position: [180, 950, -320], target: [180, 0, -570] },
  hall: { floor: 'p1', position: [270, 1250, -250], target: [270, 300, -500] },
  suite: { floor: 'p1', position: [270, 1250, -557], target: [270, 300, -807] },
  'quarto-1': { floor: 'p1', position: [240, 1250, 50], target: [240, 300, -200] },
  'quarto-2': { floor: 'p1', position: [680, 1250, 10], target: [680, 300, -240] },
  'wc-suite': { floor: 'p1', position: [700, 1250, -562], target: [700, 300, -812] },
  'wc-comum': { floor: 'p1', position: [700, 1250, -365], target: [700, 300, -615] },
  sotao: { floor: 'sotao', position: [430, 1550, -250], target: [430, 600, -500] },
  exterior: { floor: 'exterior' },
};
export const viewFor = (roomId, floorOverride) => {
  const rv = ROOM_VIEW[roomId] || { floor: 'exterior' }, fl = FLOORS[floorOverride || rv.floor];
  const own = !floorOverride || floorOverride === rv.floor;
  return { floor: floorOverride || rv.floor, cut: fl.cut, position: (own && rv.position) || fl.position, target: (own && rv.target) || fl.target };
};
