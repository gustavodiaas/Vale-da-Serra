import * as THREE from 'three';
import { DEFAULT_WEATHER, type ValeWeather } from './weather';

export type ValeStage = 1 | 2 | 3 | 4 | 5;
export interface ValeHandle {
  setStage(n: ValeStage): void;
  setWeather(w: ValeWeather): void;
  dispose(): void;
}

interface Item {
  g: THREE.Group;
  min: number;
  k: number;
}
interface Car {
  m: THREE.Mesh;
  dir: number;
  pos: number;
  axis: 'x' | 'z';
}

const lam = (c: THREE.ColorRepresentation) => new THREE.MeshLambertMaterial({ color: c });

function box(w: number, h: number, d: number, c: THREE.ColorRepresentation, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function winMat(w: number, h: number, body: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = body;
    g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#8fc4ea';
    g.fillRect(5, 6, 22, 16);
    g.fillStyle = 'rgba(255,255,255,.4)';
    g.fillRect(5, 6, 22, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, Math.round(w / 2.2)), Math.max(1, Math.round(h / 2.4)));
  return new THREE.MeshLambertMaterial({ map: t });
}

function tower(g: THREE.Group, x: number, z: number, w: number, d: number, h: number, body: string, roof: THREE.ColorRepresentation) {
  const r = lam(roof);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [winMat(d, h, body), winMat(d, h, body), r, r, winMat(w, h, body), winMat(w, h, body)]);
  m.position.set(x, h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

function tree(g: THREE.Group, x: number, z: number, s: number) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.22 * s, s, 6), lam(0x7a5a3a));
  t.position.set(x, 0.5 * s, z);
  t.castShadow = true;
  const l = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 2.6 * s, 7), lam(0x4f9a6b));
  l.position.set(x, 1.9 * s, z);
  l.castShadow = true;
  g.add(t, l);
}

const TREES: { min: number; pts: [number, number][] }[] = [
  { min: 1, pts: [[-17, -3], [-3, -17], [-14, -15], [-4, -5.5], [-18, -12], [-20, -4], [-6, -20], [-12, -19]] },
  { min: 3, pts: [[4, -16], [18, -14], [20, -4], [3, 18], [-4, 6], [-18, 16], [-6, 20], [-20, 6]] },
  { min: 4, pts: [[3.5, 4.5], [4, 12], [19, 13], [20, 19], [5, 19], [16, 19.5]] },
];

/** Cena 3D do Vale. Tudo procedural (sem assets externos). O prédio nunca some, só cresce com o estágio. */
export function createVale(canvas: HTMLCanvasElement, initial: ValeStage = 1): ValeHandle | null {
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
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  let weather: ValeWeather = DEFAULT_WEATHER;
  let baseSky = new THREE.Color('#dbeaf6');
  let hemi: THREE.HemisphereLight;
  let sun: THREE.DirectionalLight;
  let precip: { pts: THREE.Points; kind: 'rain' | 'snow'; speed: number } | null = null;

  const paint = () => {
    const c = baseSky.clone();
    let light = 1;
    let fogNear = 70;
    let fogFar = 150;
    const grey = new THREE.Color('#9aa7b3');
    switch (weather.kind) {
      case 'cloudy': c.lerp(grey, 0.45); light = 0.8; break;
      case 'rain': c.lerp(grey, 0.65); light = 0.6; fogNear = 45; fogFar = 120; break;
      case 'storm': c.lerp(new THREE.Color('#5d6875'), 0.8); light = 0.45; fogNear = 40; fogFar = 105; break;
      case 'snow': c.lerp(new THREE.Color('#e8eef4'), 0.65); light = 0.85; fogNear = 40; fogFar = 110; break;
      case 'fog': c.lerp(new THREE.Color('#c4ccd3'), 0.8); light = 0.7; fogNear = 18; fogFar = 85; break;
      default: break;
    }
    if (!weather.isDay) {
      c.lerp(new THREE.Color('#0b1626'), 0.88);
      light *= 0.35;
    }
    scene.background = c;
    scene.fog = new THREE.Fog(c, fogNear, fogFar);
    hemi.intensity = 0.8 * Math.PI * light;
    sun.intensity = 0.85 * Math.PI * light * (weather.kind === 'clear' ? 1 : 0.6);
  };
  const applyTheme = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--vale-sky').trim() || '#dbeaf6';
    baseSky = new THREE.Color(v);
    paint();
  };
  dark.addEventListener('change', applyTheme);

  const cam = new THREE.PerspectiveCamera(32, 1, 1, 300);
  // intensidades x PI: luzes fisicamente corretas do three moderno
  hemi = new THREE.HemisphereLight(0xffffff, 0x88aa88, 0.8 * Math.PI);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 0.85 * Math.PI);
  sun.position.set(22, 38, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -40;
  sc.right = sc.top = 40;
  sc.near = 5;
  sc.far = 120;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), lam(0xb8d8b0));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  scene.add(box(64, 0.12, 3.6, 0x5b6b7a, 0, 0.06, 0), box(3.6, 0.12, 64, 0x5b6b7a, 0, 0.06, 0));

  const items: Item[] = [];
  const item = (min: number) => {
    const g = new THREE.Group();
    scene.add(g);
    items.push({ g, min, k: 0 });
    return g;
  };

  // 1. garagem
  const g1 = item(1);
  g1.add(box(6, 3, 5, 0xf4efe6, -9, 1.5, -9));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 1.9, 4), lam(0x2d4f7a));
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-9, 3.95, -9);
  roof.castShadow = true;
  g1.add(roof, box(3.2, 2.2, 0.2, 0xe0b020, -9, 1.1, -6.4), box(1.2, 0.9, 2.2, 0xc0504a, -12.4, 0.45, -5.2));
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
  sp.position.set(-9, 4.9, -6.3);
  g1.add(sp);

  // 2. coworking
  const g2 = item(2);
  tower(g2, 9, -9, 10, 6, 4, '#e9eef3', 0x9aa9b8);
  g2.add(box(10.4, 0.3, 6.4, 0xf2c230, 9, 4.15, -9));

  // 3. escritório
  tower(item(3), -10, 9, 7, 7, 10, '#dde6ee', 0x8798ab);

  // 4. campus
  const g4 = item(4);
  tower(g4, 8, 8, 6, 5, 6, '#e9eef3', 0x9aa9b8);
  tower(g4, 15, 8, 5, 5, 8, '#dde6ee', 0x8798ab);
  tower(g4, 11.5, 15, 6, 4, 5, '#e9eef3', 0x9aa9b8);
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32), lam(0x5aa9d6));
  pond.position.set(11.5, 0.12, 11.8);
  pond.receiveShadow = true;
  g4.add(pond);

  // 5. torre
  const g5 = item(5);
  tower(g5, 21, -9, 7, 7, 24, '#cfe0ee', 0x12304f);
  g5.add(box(7.4, 1, 7.4, 0xf2c230, 21, 24.5, -9), box(0.3, 4, 0.3, 0xf2c230, 21, 27, -9));

  for (const { min, pts } of TREES) {
    const g = item(min);
    for (const [i, [x, z]] of pts.entries()) tree(g, x, z, 0.9 + ((i * 37) % 5) / 10);
  }

  const cars: Car[] = [
    { m: box(1.8, 0.7, 0.9, 0xc0504a, 0, 0.45, -0.9), dir: 1, pos: 0, axis: 'x' },
    { m: box(1.8, 0.7, 0.9, 0x2d4f7a, 0, 0.45, 0.9), dir: -1, pos: 10, axis: 'x' },
    { m: box(0.9, 0.7, 1.8, 0xe0b020, 0.9, 0.45, 0), dir: 1, pos: -8, axis: 'z' },
  ];
  cars.forEach((c) => scene.add(c.m));
  applyTheme();

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
    const n = kind === 'rain' ? 900 : 600;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 70;
      arr[i * 3 + 1] = Math.random() * 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color: kind === 'rain' ? 0x9ec3e6 : 0xffffff, size: kind === 'rain' ? 0.14 : 0.35, transparent: true, opacity: 0.85, fog: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    precip = { pts, kind, speed: kind === 'rain' ? 28 : 3 };
  };

  // câmera orbital
  let th = 0.8;
  let ph = 0.95;
  let rad = 42;
  let auto = !reduce;
  const tgt = new THREE.Vector3(3, 3, 0);
  let drag: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
    auto = false;
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    th -= (e.clientX - drag.x) * 0.006;
    ph = Math.min(1.25, Math.max(0.45, ph - (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    rad = Math.min(70, Math.max(16, rad * (1 + e.deltaY * 0.001)));
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  let stage: number = initial;
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (auto) th += dt * 0.1;
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
    if (!reduce) {
      for (const c of cars) {
        c.pos += c.dir * dt * 4;
        if (c.pos > 30) c.pos = -30;
        if (c.pos < -30) c.pos = 30;
        c.m.position[c.axis] = c.pos;
      }
    }
    cam.position.set(tgt.x + rad * Math.sin(ph) * Math.cos(th), tgt.y + rad * Math.cos(ph), tgt.z + rad * Math.sin(ph) * Math.sin(th));
    cam.lookAt(tgt);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    setStage(n) {
      stage = n;
    },
    setWeather(w) {
      weather = w;
      paint();
      setPrecip(w.kind === 'rain' || w.kind === 'storm' ? 'rain' : w.kind === 'snow' ? 'snow' : null);
    },
    dispose() {
      cancelAnimationFrame(raf);
      clearPrecip();
      ro.disconnect();
      dark.removeEventListener('change', applyTheme);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
