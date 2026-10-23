import * as THREE from 'three';
import { DEFAULT_WEATHER, type ValeWeather } from './weather';

export type ValeStage = 1 | 2 | 3 | 4 | 5;
export type LabelId = 'garagem' | 'compliance' | 'conselho' | 'cafe' | 'coworking' | 'escritorio' | 'campus' | 'torre';

export interface ValeHandle {
  setStage(n: ValeStage): void;
  setWeather(w: ValeWeather): void;
  setLabel(id: LabelId, text: string): void;
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
}

interface Item {
  g: THREE.Group;
  min: number;
  k: number;
}
type Mover =
  | { kind: 'line'; m: THREE.Object3D; axis: 'x' | 'z'; lane: number; dir: number; pos: number; lo: number; hi: number }
  | { kind: 'ring'; m: THREE.Object3D; ang: number; speed: number; r: number };

interface LabelDef {
  id: LabelId;
  name: string;
  pos: [number, number, number];
  min: number;
}

const LABEL_DEFS: LabelDef[] = [
  { id: 'garagem', name: 'Garagem', pos: [-15, 7.4, -15], min: 1 },
  { id: 'coworking', name: 'Coworking', pos: [15, 7, -15], min: 2 },
  { id: 'escritorio', name: 'Escritório', pos: [-15, 13, 15], min: 3 },
  { id: 'campus', name: 'Campus', pos: [17, 11, 16], min: 4 },
  { id: 'torre', name: 'Torre', pos: [32, 30, -15], min: 5 },
  { id: 'compliance', name: 'Compliance', pos: [-33, 8, -15], min: 1 },
  { id: 'conselho', name: 'Conselho', pos: [-33, 7, 15], min: 1 },
  { id: 'cafe', name: 'Cafeteria', pos: [34, 6, 14], min: 1 },
];

const lam = (c: THREE.ColorRepresentation) => new THREE.MeshLambertMaterial({ color: c });

function box(w: number, h: number, d: number, c: THREE.ColorRepresentation, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt: number, rb: number, h: number, c: THREE.ColorRepresentation, x: number, y: number, z: number, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), lam(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function pyramid(w: number, d: number, h: number, c: THREE.ColorRepresentation, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(w / Math.SQRT2, h, 4), lam(c));
  m.rotation.y = Math.PI / 4;
  m.scale.z = d / w;
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Fachada com janelas. À noite as janelas acendem (emissive controlado por `reg`). */
function facade(w: number, h: number, body: string, reg: THREE.MeshLambertMaterial[]) {
  const mk = (bg: string, win: string, top: string) => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = bg;
      g.fillRect(0, 0, 32, 32);
      g.fillStyle = win;
      g.fillRect(5, 6, 22, 16);
      g.fillStyle = top;
      g.fillRect(5, 6, 22, 5);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, Math.round(w / 2.2)), Math.max(1, Math.round(h / 2.4)));
    return t;
  };
  const m = new THREE.MeshLambertMaterial({
    map: mk(body, '#8fc4ea', 'rgba(255,255,255,.4)'),
    emissiveMap: mk('#000000', '#ffd27a', '#000000'),
    emissive: new THREE.Color(0xffffff),
  });
  m.emissiveIntensity = 0;
  reg.push(m);
  return m;
}

function tower(g: THREE.Group, reg: THREE.MeshLambertMaterial[], x: number, z: number, w: number, d: number, h: number, body: string, roof: THREE.ColorRepresentation) {
  const r = lam(roof);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [facade(d, h, body, reg), facade(d, h, body, reg), r, r, facade(w, h, body, reg), facade(w, h, body, reg)]);
  m.position.set(x, h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

/** Terreno do lote, com borda escura, como as quadras do mapa de referência. */
function plot(g: THREE.Group, w: number, d: number) {
  g.add(box(w + 0.9, 0.16, d + 0.9, 0x39463f, 0, 0.08, 0), box(w, 0.24, d, 0x86b57d, 0, 0.12, 0));
}

function carMesh(color: number) {
  const g = new THREE.Group();
  g.add(box(1.9, 0.6, 0.95, color, 0, 0.5, 0), box(0.95, 0.5, 0.85, 0xdfe8f0, -0.1, 1.0, 0));
  return g;
}

/** Cena 3D do Vale. Tudo procedural (sem assets externos). O prédio nunca some, só cresce com o estágio. */
export function createVale(canvas: HTMLCanvasElement, overlay: HTMLElement, initial: ValeStage = 1): ValeHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const windowMats: THREE.MeshLambertMaterial[] = [];
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c0 });
  let weather: ValeWeather = DEFAULT_WEATHER;
  let precip: { pts: THREE.Points; kind: 'rain' | 'snow'; speed: number } | null = null;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa88, 0.8 * Math.PI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.85 * Math.PI);
  sun.position.set(30, 50, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -60;
  sc.right = sc.top = 60;
  sc.near = 5;
  sc.far = 200;
  scene.add(sun);

  const paint = () => {
    const night = !weather.isDay;
    const c = new THREE.Color('#bcd7ea');
    let light = 1;
    let fogNear = 110;
    let fogFar = 260;
    switch (weather.kind) {
      case 'cloudy': c.lerp(new THREE.Color('#9aa7b3'), 0.45); light = 0.8; break;
      case 'rain': c.lerp(new THREE.Color('#9aa7b3'), 0.65); light = 0.6; fogNear = 70; fogFar = 190; break;
      case 'storm': c.lerp(new THREE.Color('#5d6875'), 0.8); light = 0.45; fogNear = 60; fogFar = 160; break;
      case 'snow': c.lerp(new THREE.Color('#e8eef4'), 0.65); light = 0.85; fogNear = 60; fogFar = 170; break;
      case 'fog': c.lerp(new THREE.Color('#c4ccd3'), 0.8); light = 0.7; fogNear = 30; fogFar = 130; break;
      default: break;
    }
    if (night) {
      c.lerp(new THREE.Color('#0b1626'), 0.9);
      light *= 0.5;
    }
    scene.background = c;
    scene.fog = new THREE.Fog(c, fogNear, fogFar);
    hemi.color.set(night ? 0x7788bb : 0xffffff);
    hemi.intensity = 0.8 * Math.PI * light;
    sun.color.set(night ? 0x9fb4ff : 0xffffff);
    sun.intensity = 0.85 * Math.PI * light * (weather.kind === 'clear' ? 1 : 0.6);
    for (const m of windowMats) m.emissiveIntensity = night ? 0.9 : 0;
    lampMat.color.set(night ? 0xffd36b : 0xd8d2c0);
  };

  const cam = new THREE.PerspectiveCamera(24, 1, 1, 500);

  // chão, lago e estradas
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), lam(0x4d7f50));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const lake = { x: -46, z: 36, r: 14 };
  scene.add(cyl(lake.r + 2.2, lake.r + 2.2, 0.06, 0xd9c79a, lake.x, 0.03, lake.z, 40), cyl(lake.r, lake.r, 0.1, 0x3f86b8, lake.x, 0.07, lake.z, 40));

  const asphalt = 0x4a5360;
  const walk = 0xc9c9c0;
  const ringWalk = new THREE.Mesh(new THREE.RingGeometry(5.6, 11.2, 56), lam(walk));
  ringWalk.rotation.x = -Math.PI / 2;
  ringWalk.position.y = 0.05;
  ringWalk.receiveShadow = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 10.4, 56), lam(asphalt));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.receiveShadow = true;
  scene.add(ringWalk, ring);
  for (const s of [-1, 1]) {
    scene.add(
      box(52, 0.06, 5.4, walk, s * 37, 0.05, 0),
      box(52, 0.12, 4, asphalt, s * 37, 0.08, 0),
      box(52, 0.02, 0.12, 0xe8e2c8, s * 37, 0.15, 0),
      box(5.4, 0.06, 52, walk, 0, 0.05, s * 37),
      box(4, 0.12, 52, asphalt, 0, 0.08, s * 37),
      box(0.12, 0.02, 52, 0xe8e2c8, 0, 0.15, s * 37),
    );
  }

  // praça central
  const plaza = new THREE.Group();
  plaza.add(cyl(5.6, 5.6, 0.3, 0x86b57d, 0, 0.15, 0, 40), cyl(2.2, 2.4, 0.5, 0xc9c9c0, 0, 0.5, 0, 24), cyl(1.5, 1.5, 0.15, 0x5aa9d6, 0, 0.8, 0, 24));
  plaza.add(cyl(0.45, 0.55, 5.5, 0xf2c230, 0, 3.0, 0, 16), cyl(0.9, 0.9, 0.3, 0xf2c230, 0, 5.9, 0, 16));
  scene.add(plaza);

  const items: Item[] = [];
  const item = (min: number, x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    items.push({ g, min, k: 0 });
    return g;
  };

  // 1. garagem
  const g1 = item(1, -15, -15);
  plot(g1, 12, 11);
  g1.add(box(6, 3, 5, 0xf4efe6, 0, 1.7, 0), pyramid(6.4, 5.6, 1.9, 0x2d4f7a, 0, 4.1, 0), box(3.2, 2.2, 0.2, 0xe0b020, 0, 1.3, 2.6), box(1.2, 0.9, 2.2, 0xc0504a, -3.8, 0.7, 2.6));
  const sign = document.createElement('canvas');
  sign.width = 256;
  sign.height = 64;
  const sg = sign.getContext('2d');
  if (sg) {
    sg.fillStyle = '#12304f';
    sg.fillRect(0, 0, 256, 64);
    sg.fillStyle = '#f2c230';
    sg.font = '700 38px system-ui, sans-serif';
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.fillText('Garagem', 128, 34);
  }
  const signTex = new THREE.CanvasTexture(sign);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTex }));
  sp.position.set(0, 3.5, 2.75);
  g1.add(sp);

  // 2. coworking
  const g2 = item(2, 15, -15);
  plot(g2, 14, 10);
  tower(g2, windowMats, 0, 0, 10, 6, 4, '#e9eef3', 0x9aa9b8);
  g2.position.y = 0;
  g2.add(box(10.4, 0.3, 6.4, 0xf2c230, 0, 4.4, 0));

  // 3. escritório
  const g3 = item(3, -15, 15);
  plot(g3, 11, 11);
  tower(g3, windowMats, 0, 0, 7, 7, 10, '#dde6ee', 0x8798ab);

  // 4. campus
  const g4 = item(4, 17, 16);
  plot(g4, 16, 14);
  tower(g4, windowMats, -4, -3, 6, 5, 6, '#e9eef3', 0x9aa9b8);
  tower(g4, windowMats, 3, -3, 5, 5, 8, '#dde6ee', 0x8798ab);
  tower(g4, windowMats, 0, 4, 6, 4, 5, '#e9eef3', 0x9aa9b8);
  g4.add(cyl(1.2, 1.2, 0.2, 0x5aa9d6, -5, 0.3, 4.5, 28));

  // 5. torre
  const g5 = item(5, 32, -15);
  plot(g5, 10, 10);
  tower(g5, windowMats, 0, 0, 7, 7, 24, '#cfe0ee', 0x12304f);
  g5.add(box(7.4, 1, 7.4, 0xf2c230, 0, 24.5, 0), box(0.3, 4, 0.3, 0xf2c230, 0, 27, 0));

  // sempre presentes: compliance (prefeitura), conselho e cafeteria
  const gc = item(1, -33, -15);
  plot(gc, 13, 11);
  gc.add(box(9, 4, 6, 0xd8cfbd, 0, 2.3, 0), box(10, 0.4, 7, 0xb9ad98, 0, 4.6, 0), pyramid(8, 5, 1.6, 0x7a4a3a, 0, 5.6, 0), box(9, 0.3, 2.4, 0xb9ad98, 0, 0.4, 4));
  for (const cx of [-3.2, -1.1, 1.1, 3.2]) gc.add(cyl(0.3, 0.3, 3.6, 0xf0ebe0, cx, 2.1, 3.4, 10));
  gc.add(cyl(0.06, 0.06, 5, 0xcccccc, 6, 2.7, 4), box(1.1, 0.7, 0.05, 0x2f8f5b, 6.6, 4.9, 4));

  const gcs = item(1, -33, 15);
  plot(gcs, 11, 9);
  tower(gcs, windowMats, 0, 0, 7, 5, 4.5, '#e9eef3', 0x9aa9b8);
  gcs.add(box(7.6, 0.5, 5.6, 0xe0708f, 0, 4.7, 0), box(3, 2.2, 0.2, 0x3a3f4a, 0, 1.3, 2.6));

  const gcf = item(1, 34, 14);
  plot(gcf, 9, 8);
  gcf.add(box(5, 3, 4, 0xf4efe6, -1, 1.7, -0.5), box(5.4, 0.3, 4.4, 0x8a4b3a, -1, 3.35, -0.5));
  for (const [i, ax] of [-3, -2, -1, 0, 1].entries()) gcf.add(box(1, 0.15, 1.4, i % 2 ? 0xffffff : 0xc0504a, ax, 2.8, 2.1));
  for (const tx of [2.4, 3.6]) gcf.add(cyl(0.45, 0.45, 0.08, 0xffffff, tx, 0.95, 2, 12), cyl(0.06, 0.06, 0.8, 0x666666, tx, 0.55, 2, 6));

  // floresta densa fora das ruas e dos lotes
  const rects: [number, number, number, number][] = [
    [-15, -15, 8, 7.5], [15, -15, 9, 7], [-15, 15, 8, 8], [17, 16, 10, 9.5], [32, -15, 7, 7],
    [-33, -15, 9, 8], [-33, 15, 8, 6.5], [34, 14, 7, 6],
  ];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const spots: { x: number; z: number; s: number; pine: boolean }[] = [];
  for (let i = 0; i < 1400 && spots.length < 520; i++) {
    const x = (rnd() - 0.5) * 190;
    const z = (rnd() - 0.5) * 150;
    if (Math.abs(z) < 4.6 && Math.abs(x) > 5) continue;
    if (Math.abs(x) < 4.6 && Math.abs(z) > 5) continue;
    if (Math.hypot(x, z) < 12.5) continue;
    if (Math.hypot(x - lake.x, z - lake.z) < lake.r + 3) continue;
    if (rects.some(([cx, cz, hw, hd]) => Math.abs(x - cx) < hw && Math.abs(z - cz) < hd)) continue;
    spots.push({ x, z, s: 0.8 + rnd() * 0.7, pine: rnd() < 0.7 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1, 6);
  const pineGeo = new THREE.ConeGeometry(1.2, 3.4, 7);
  const blobGeo = new THREE.IcosahedronGeometry(1.4, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, lam(0x6b4f35), spots.length);
  const pines = new THREE.InstancedMesh(pineGeo, lam(0xffffff), spots.length);
  const blobs = new THREE.InstancedMesh(blobGeo, lam(0xffffff), spots.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let np = 0;
  let nb = 0;
  for (const [i, t] of spots.entries()) {
    dummy.rotation.set(0, rnd() * 6, 0);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.position.set(t.x, 0.5 * t.s, t.z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, t.pine ? 2.3 * t.s : 2.0 * t.s, t.z);
    dummy.updateMatrix();
    if (t.pine) {
      pines.setMatrixAt(np, dummy.matrix);
      pines.setColorAt(np, col.setHSL(0.36 + rnd() * 0.04, 0.35, 0.2 + rnd() * 0.08));
      np++;
    } else {
      blobs.setMatrixAt(nb, dummy.matrix);
      blobs.setColorAt(nb, col.setHSL(0.27 + rnd() * 0.07, 0.35, 0.28 + rnd() * 0.08));
      nb++;
    }
  }
  trunks.count = spots.length;
  pines.count = np;
  blobs.count = nb;
  for (const m of [trunks, pines, blobs]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    scene.add(m);
  }

  // postes de luz
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6);
  const poleMat = lam(0x3b4252);
  const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
  const lamp = (x: number, z: number) => {
    const p = new THREE.Mesh(poleGeo, poleMat);
    p.position.set(x, 1.6, z);
    const h = new THREE.Mesh(headGeo, lampMat);
    h.position.set(x, 3.3, z);
    scene.add(p, h);
  };
  for (const s of [-1, 1]) {
    for (const d of [14, 22, 30, 38, 46, 54]) {
      lamp(s * d, 3.3);
      lamp(s * d, -3.3);
      lamp(3.3, s * d);
      lamp(-3.3, s * d);
    }
  }
  for (let i = 0; i < 8; i++) lamp(Math.cos((i * Math.PI) / 4) * 11.6, Math.sin((i * Math.PI) / 4) * 11.6);

  // trânsito
  const movers: Mover[] = [];
  const addLine = (color: number, axis: 'x' | 'z', lane: number, dir: number, pos: number, lo: number, hi: number) => {
    const m = carMesh(color);
    scene.add(m);
    movers.push({ kind: 'line', m, axis, lane, dir, pos, lo, hi });
  };
  addLine(0xc0504a, 'x', 1, 1, 14, 11, 62);
  addLine(0x2d4f7a, 'x', -1, -1, -20, -62, -11);
  addLine(0xe0b020, 'z', 1, 1, 20, 11, 62);
  addLine(0x5aa9d6, 'z', -1, -1, -30, -62, -11);
  for (const [a, color] of [[0, 0xf2f2f2], [Math.PI, 0xc0504a]] as const) {
    const m = carMesh(color);
    scene.add(m);
    movers.push({ kind: 'ring', m, ang: a, speed: 0.35, r: 8.4 });
  }

  // etiquetas HTML ancoradas nos prédios
  const labels = LABEL_DEFS.map((def) => {
    const el = document.createElement('div');
    el.className = 'vale-label';
    const name = document.createElement('b');
    name.textContent = def.name;
    const info = document.createElement('span');
    el.append(name, info);
    overlay.appendChild(el);
    return { def, el, info, pos: new THREE.Vector3(...def.pos) };
  });

  // câmera: ângulo fixo estilo mapa, arrastar para mover, roda para zoom
  const th = 0.785;
  const ph = 0.92;
  let rad = 78;
  let radT = 78;
  const home = new THREE.Vector3(0, 0, 4);
  const tgt = home.clone();
  let drag: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const k = rad * 0.0016;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    tgt.x += -Math.sin(th) * dx * k - Math.cos(th) * dy * k;
    tgt.z += Math.cos(th) * dx * k - Math.sin(th) * dy * k;
    tgt.x = Math.min(60, Math.max(-60, tgt.x));
    tgt.z = Math.min(50, Math.max(-50, tgt.z));
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => {
    drag = null;
  };
  const clampRad = (v: number) => Math.min(130, Math.max(24, v));
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    radT = clampRad(radT * (1 + e.deltaY * 0.001));
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  let stage: number = initial;
  let w = 1;
  let h = 1;
  const resize = () => {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    w = cw;
    h = ch;
    renderer.setSize(cw, ch, false);
    cam.aspect = cw / ch;
    cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const clearPrecip = () => {
    if (!precip) return;
    scene.remove(precip.pts);
    precip.pts.geometry.dispose();
    (precip.pts.material as THREE.Material).dispose();
    precip = null;
  };
  const setPrecip = (kind: 'rain' | 'snow' | null) => {
    if (precip?.kind === kind) return;
    clearPrecip();
    if (!kind) return;
    const n = kind === 'rain' ? 1600 : 1000;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 120;
      arr[i * 3 + 1] = Math.random() * 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color: kind === 'rain' ? 0x9ec3e6 : 0xffffff, size: kind === 'rain' ? 0.18 : 0.45, transparent: true, opacity: 0.85, fog: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    precip = { pts, kind, speed: kind === 'rain' ? 28 : 3 };
  };

  paint();

  let last = performance.now();
  let raf = 0;
  const v3 = new THREE.Vector3();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    rad += (radT - rad) * Math.min(1, dt * 8);
    for (const o of items) {
      o.k += ((stage >= o.min ? 1 : 0) - o.k) * Math.min(1, dt * 6);
      o.g.visible = o.k > 0.01;
      o.g.scale.y = Math.max(o.k, 0.001);
    }
    if (precip && !reduce) {
      const a = precip.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - precip.speed * dt;
        if (precip.kind === 'snow') a.setX(i, a.getX(i) + Math.sin(now / 800 + i) * dt * 0.8);
        if (y < 0) y += 40;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
    if (precip) precip.pts.position.set(tgt.x, 0, tgt.z);
    if (!reduce) {
      for (const c of movers) {
        if (c.kind === 'line') {
          c.pos += c.dir * dt * 5;
          if (c.pos > c.hi) c.pos = c.lo;
          if (c.pos < c.lo) c.pos = c.hi;
          if (c.axis === 'x') {
            c.m.position.set(c.pos, 0, c.lane);
            c.m.rotation.y = c.dir > 0 ? 0 : Math.PI;
          } else {
            c.m.position.set(c.lane, 0, c.pos);
            c.m.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
          }
        } else {
          c.ang += dt * c.speed;
          c.m.position.set(Math.cos(c.ang) * c.r, 0, Math.sin(c.ang) * c.r);
          c.m.rotation.y = Math.atan2(-Math.cos(c.ang), -Math.sin(c.ang));
        }
      }
    }
    cam.position.set(tgt.x + rad * Math.sin(ph) * Math.cos(th), tgt.y + rad * Math.cos(ph), tgt.z + rad * Math.sin(ph) * Math.sin(th));
    cam.lookAt(tgt);
    cam.updateMatrixWorld();
    renderer.render(scene, cam);
    for (const l of labels) {
      v3.copy(l.pos).project(cam);
      const show = stage >= l.def.min && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      l.el.style.visibility = show ? 'visible' : 'hidden';
      if (show) l.el.style.transform = `translate(${((v3.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v3.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    setStage(n) {
      stage = n;
    },
    setWeather(wt) {
      weather = wt;
      paint();
      setPrecip(wt.kind === 'rain' || wt.kind === 'storm' ? 'rain' : wt.kind === 'snow' ? 'snow' : null);
    },
    setLabel(id, text) {
      const l = labels.find((x) => x.def.id === id);
      if (l) l.info.textContent = text;
    },
    zoom(f) {
      radT = clampRad(radT * f);
    },
    reset() {
      tgt.copy(home);
      radT = 78;
    },
    dispose() {
      cancelAnimationFrame(raf);
      clearPrecip();
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      for (const l of labels) l.el.remove();
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          const lm = m as THREE.MeshLambertMaterial;
          lm.map?.dispose();
          lm.emissiveMap?.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
