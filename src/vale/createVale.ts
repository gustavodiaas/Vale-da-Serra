import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createValeFinish } from './valeFinish';
import { DEFAULT_WEATHER, type ValeWeather } from './weather';
import type { CityAnchor } from './siliconValley';
import { buildNordicVale, NORDIC_ANCHORS } from './nordicVillage';
import { NORDIC_VIEW } from './nordicTerrain';

export type ValeStage = 1 | 2 | 3 | 4 | 5;
export type LabelId = CityAnchor['id'];

export interface ValeHandle {
  setStage(n: ValeStage): void;
  setWeather(w: ValeWeather): void;
  setLabel(id: LabelId, text: string): void;
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
}

/** Vale com terreno contínuo e modelos GLB ligados ao estágio financeiro. */
export function createVale(canvas: HTMLCanvasElement, overlay: HTMLElement, initial: ValeStage = 1, onSelect?: (id: LabelId) => void, onAssets?: (status: 'ready' | 'error') => void, onProgress?: (percent: number) => void): ValeHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  let renderRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(renderRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  let disposed = false;
  const city = buildNordicVale(scene, undefined, (loaded, total) => { if (!disposed) onProgress?.(Math.round(loaded / total * 100)); });
  let assetsReady = false;
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .38;
  environmentScene.dispose();
  let naturalEnvironment: THREE.WebGLRenderTarget | null = null;
  void new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}environment/kiara_1_dawn_1k.hdr`).then(texture => {
    if (disposed) { texture.dispose(); return; }
    naturalEnvironment = pmrem.fromEquirectangular(texture); texture.dispose();
    scene.environment = naturalEnvironment.texture;
  }).catch(() => { /* The local room environment remains available offline. */ }).finally(() => pmrem.dispose());
  let weather: ValeWeather = DEFAULT_WEATHER;
  let precip: { pts: THREE.Points; kind: 'rain' | 'snow'; speed: number } | null = null;

  const hemi = new THREE.HemisphereLight(0xe8f1ff, 0x899773, 0.65 * Math.PI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1 * Math.PI);
  sun.position.set(-35, 80, 65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -90;
  sc.right = sc.top = 90;
  sc.near = 5;
  sc.far = 240;
  scene.add(sun);

  const paint = () => {
    const night = !weather.isDay;
    const c = new THREE.Color('#bdccd0');
    let light = 1;
    let fogNear = 250;
    let fogFar = 550;
    switch (weather.kind) {
      case 'cloudy': c.lerp(new THREE.Color('#9aa7b3'), 0.45); light = 0.8; break;
      case 'rain': c.lerp(new THREE.Color('#9aa7b3'), 0.65); light = 0.7; fogNear = 160; fogFar = 360; break;
      case 'storm': c.lerp(new THREE.Color('#5d6875'), 0.8); light = 0.55; fogNear = 120; fogFar = 300; break;
      case 'snow': c.lerp(new THREE.Color('#e8eef4'), 0.65); light = 0.85; fogNear = 150; fogFar = 340; break;
      case 'fog': c.lerp(new THREE.Color('#c4ccd3'), 0.8); light = 0.75; fogNear = 90; fogFar = 280; break;
      default: break;
    }
    if (night) {
      c.lerp(new THREE.Color('#0b1626'), 0.9);
      light *= 0.5;
    }
    scene.environmentIntensity = night ? .1 : .48 * light;
    finish.setNight(night);
    scene.background = c;
    scene.fog = new THREE.Fog(c, fogNear, fogFar);
    hemi.color.set(night ? 0x7788bb : 0xe8f1ff);
    hemi.intensity = 0.65 * Math.PI * light;
    sun.color.set(night ? 0x9fb4ff : 0xfff1dc);
    sun.intensity = 1.1 * Math.PI * light * (weather.kind === 'clear' ? 1 : 0.85);
    for (const m of city.windows) m.emissiveIntensity = night ? 1 : .18;
  };

  const cam = new THREE.PerspectiveCamera(36, 1, 1, 700);
  const finish = createValeFinish(renderer, scene, cam);

  // etiquetas HTML ancoradas nos prédios
  const labels = NORDIC_ANCHORS.map((def) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', `Visitar ${def.name}`);
    el.addEventListener('click', () => onSelect?.(def.id));
    el.className = 'vale-label';
    el.style.visibility = 'hidden';
    el.dataset.id = def.id;
    const name = document.createElement('b');
    name.textContent = def.name;
    const info = document.createElement('span');
    el.append(name, info);
    overlay.appendChild(el);
    return { def, el, info, text: '', pos: new THREE.Vector3(...def.position) };
  });

  // câmera: ângulo fixo estilo mapa, arrastar para mover, roda para zoom
  const th = NORDIC_VIEW.azimuth;
  const ph = NORDIC_VIEW.polar;
  let rad: number = NORDIC_VIEW.radius;
  let radT: number = NORDIC_VIEW.radius;
  const home = new THREE.Vector3(...NORDIC_VIEW.target);
  const tgt = home.clone();
  let drag: { x: number; y: number } | null = null;
  let press: { x: number; y: number; moved: boolean } | null = null;
  const raycaster = new THREE.Raycaster();
  const onDown = (e: PointerEvent) => {
    renderer.setPixelRatio(Math.min(1, renderRatio));
    finish.resize(w, h, Math.min(1, renderRatio));
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
    press = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const k = rad * 0.0016;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) press.moved = true;
    tgt.x += -Math.sin(th) * dx * k - Math.cos(th) * dy * k;
    tgt.z += Math.cos(th) * dx * k - Math.sin(th) * dy * k;
    tgt.x = Math.min(90, Math.max(-90, tgt.x));
    tgt.z = Math.min(70, Math.max(-90, tgt.z));
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (e.type === 'pointerup' && press && !press.moved) {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), cam);
      const visible = city.buildings.filter(b => b.group.visible && b.scale > .9);
      const hit = raycaster.intersectObjects(visible.map(b => b.group), true)[0];
      if (hit) { const building = visible.find(b => b.group.getObjectById(hit.object.id)); if (building) onSelect?.(building.id); }
    }
    drag = null;
    press = null;
    renderer.setPixelRatio(renderRatio);
    finish.resize(w, h, renderRatio);
  };
  const clampRad = (v: number) => Math.min(215, Math.max(35, v));
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
  const progressKey = 'garagem:vale:unlocked:v1';
  try { const saved = Number(localStorage.getItem(progressKey)); if (Number.isInteger(saved) && saved >= 1 && saved <= 5) stage = Math.max(initial, saved); } catch { /* Scene still works when storage is unavailable. */ }
  let w = 1;
  let h = 1;
  const resize = () => {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    w = cw;
    h = ch;
    renderer.setSize(cw, ch, false);
    finish.resize(cw, ch, renderer.getPixelRatio());
    cam.aspect = cw / ch;
    cam.fov = cw < ch ? 52 : 36;
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
  let elapsed = 0;
  let slowFrames = 0;
  let labelX = NaN, labelZ = NaN, labelRad = NaN, labelStage = -1, labelWidth = -1, labelHeight = -1;
  void city.ready.then(() => {
    if (disposed) return;
    assetsReady = true;
    city.setStage(stage);
    for (const label of labels) label.pos.set(...label.def.position);
    labelStage = -1;
    renderer.shadowMap.needsUpdate = true;
    paint(); onAssets?.('ready');
  }).catch(() => { if (!disposed) onAssets?.('error'); });
  let raf = 0;
  const v3 = new THREE.Vector3();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    if (now - last < 1000 / 30 - 1) return;
    const interval = now - last;
    const dt = Math.min(.1, interval / 1000);
    last = now;
    slowFrames = interval > 55 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames >= 20 && renderRatio > .8) { renderRatio = Math.max(.8, renderRatio - .15); renderer.setPixelRatio(drag ? Math.min(1, renderRatio) : renderRatio); finish.resize(w, h, renderer.getPixelRatio()); finish.setQuality(renderRatio < 1 ? 'low' : 'medium'); slowFrames = 0; }
    if (!reduce) elapsed += dt;
    if (!reduce && !drag) city.update(elapsed);
    rad += (radT - rad) * Math.min(1, dt * 8);
    for (const building of city.buildings) {
      const target = stage >= building.min ? 1 : 0;
      const previousScale = building.scale;
      building.scale = reduce || Math.abs(target - building.scale) < .002 ? target : building.scale + (target - building.scale) * Math.min(1, dt * 6);
      if (previousScale !== building.scale) renderer.shadowMap.needsUpdate = true;
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
    cam.position.set(tgt.x + rad * Math.sin(ph) * Math.cos(th), tgt.y + rad * Math.cos(ph), tgt.z + rad * Math.sin(ph) * Math.sin(th));
    cam.lookAt(tgt);
    cam.updateMatrixWorld();
    finish.render();
    const moveLabels = labelX !== tgt.x || labelZ !== tgt.z || Math.abs(labelRad - rad) > .001 || !Number.isFinite(labelRad) || labelStage !== stage || labelWidth !== w || labelHeight !== h;
    if (!moveLabels) return;
    labelX = tgt.x; labelZ = tgt.z; labelRad = rad; labelStage = stage; labelWidth = w; labelHeight = h;
    for (const l of labels) {
      v3.copy(l.pos).project(cam);
      const locked = stage < l.def.min;
      l.el.classList.toggle('is-locked', locked); l.el.disabled = locked;
      l.info.textContent = locked ? `Em obras · Nível ${l.def.min}` : l.text;
      const show = assetsReady && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      l.el.style.visibility = show ? 'visible' : 'hidden';
      if (show) l.el.style.transform = `translate(${((v3.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v3.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    setStage(n) {
      stage = Math.max(stage, n);
      try { localStorage.setItem(progressKey, String(stage)); } catch { /* Persistence is optional. */ }
      city.setStage(stage);
      renderer.shadowMap.needsUpdate = true;
    },
    setWeather(wt) {
      weather = wt;
      paint();
      setPrecip(wt.kind === 'rain' || wt.kind === 'storm' ? 'rain' : wt.kind === 'snow' ? 'snow' : null);
    },
    setLabel(id, text) {
      const l = labels.find((x) => x.def.id === id);
      if (l) { l.text = text; if (stage >= l.def.min) l.info.textContent = text; }
    },
    zoom(f) {
      radT = clampRad(radT * f);
    },
    reset() {
      tgt.copy(home);
      radT = NORDIC_VIEW.radius;
    },
    dispose() {
      disposed = true;
      city.cancel();
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
        if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.LineSegments)) return;
        geometries.add(obj.geometry);
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          materials.add(mat);
          const surface = mat as THREE.MeshStandardMaterial;
          for (const texture of [surface.map, surface.bumpMap, surface.emissiveMap, surface.normalMap, surface.userData.depthTexture as THREE.Texture | undefined]) if (texture) textures.add(texture);
        }
        if (obj instanceof THREE.InstancedMesh) obj.dispose();
      });
      for (const geometry of geometries) geometry.dispose();
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      environment.dispose();
      naturalEnvironment?.dispose();
      finish.dispose();
      renderer.dispose();
    },
  };
}
