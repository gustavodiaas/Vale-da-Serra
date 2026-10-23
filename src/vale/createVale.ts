import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEFAULT_WEATHER, type ValeWeather } from './weather';
import { buildSiliconValley, CITY_ANCHORS } from './siliconValley';

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

/** Cena 3D procedural, com prédios ligados ao estágio financeiro atual. */
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
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const city = buildSiliconValley(scene);
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .35;
  environmentScene.dispose();
  pmrem.dispose();
  let weather: ValeWeather = DEFAULT_WEATHER;
  let precip: { pts: THREE.Points; kind: 'rain' | 'snow'; speed: number } | null = null;

  const hemi = new THREE.HemisphereLight(0xe8f1ff, 0x6d775f, 0.8 * Math.PI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.85 * Math.PI);
  sun.position.set(30, 50, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -90;
  sc.right = sc.top = 90;
  sc.near = 5;
  sc.far = 200;
  scene.add(sun);

  const paint = () => {
    const night = !weather.isDay;
    const c = new THREE.Color('#b7cedb');
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
    hemi.color.set(night ? 0x7788bb : 0xe8f1ff);
    hemi.intensity = 0.8 * Math.PI * light;
    sun.color.set(night ? 0x9fb4ff : 0xfff1dc);
    sun.intensity = 0.85 * Math.PI * light * (weather.kind === 'clear' ? 1 : 0.6);
    for (const m of city.windows) m.emissiveIntensity = night ? 0.7 : 0;
  };

  const cam = new THREE.PerspectiveCamera(32, 1, 1, 500);

  // etiquetas HTML ancoradas nos prédios
  const labels = CITY_ANCHORS.map((def) => {
    const el = document.createElement('div');
    el.className = 'vale-label';
    el.dataset.id = def.id;
    const name = document.createElement('b');
    name.textContent = def.name;
    const info = document.createElement('span');
    el.append(name, info);
    overlay.appendChild(el);
    return { def, el, info, pos: new THREE.Vector3(...def.position) };
  });

  // câmera: ângulo fixo estilo mapa, arrastar para mover, roda para zoom
  const th = 0.785;
  const ph = 0.92;
  let rad = 112;
  let radT = 112;
  const home = new THREE.Vector3(-9, 0, -8);
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
    tgt.x = Math.min(90, Math.max(-90, tgt.x));
    tgt.z = Math.min(70, Math.max(-90, tgt.z));
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => {
    drag = null;
  };
  const clampRad = (v: number) => Math.min(180, Math.max(30, v));
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
    cam.fov = cw < ch ? 52 : 32;
    if (cw > 900) cam.setViewOffset(cw, ch, -Math.min(160, cw * .1), 0, cw, ch);
    else cam.clearViewOffset();
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
    for (const building of city.buildings) {
      const target = stage >= building.min ? 1 : 0;
      building.scale = reduce ? target : building.scale + (target - building.scale) * Math.min(1, dt * 6);
      building.group.visible = building.scale > .01;
      building.group.scale.y = Math.max(building.scale, .001);
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
    for (const car of city.cars) {
      if (!reduce) car.position = ((car.position + 88 + car.direction * dt * car.speed + 176) % 176) - 88;
      const lane = car.road + car.direction * 1.7;
      car.mesh.position.set(car.axis === 'x' ? car.position : lane, .15, car.axis === 'z' ? car.position : lane);
      car.mesh.rotation.y = car.axis === 'x' ? (car.direction > 0 ? 0 : Math.PI) : (car.direction > 0 ? -Math.PI / 2 : Math.PI / 2);
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
      radT = 112;
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
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        geometries.add(obj.geometry);
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          materials.add(mat);
          const surface = mat as THREE.MeshStandardMaterial;
          for (const texture of [surface.map, surface.bumpMap, surface.emissiveMap]) if (texture) textures.add(texture);
        }
        if (obj instanceof THREE.InstancedMesh) obj.dispose();
      });
      for (const geometry of geometries) geometry.dispose();
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
