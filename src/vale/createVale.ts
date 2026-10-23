import * as THREE from 'three';
import { createCartoonFinish } from './cartoonFinish';
import { cartoonNight, createCartoonCamera, frameCartoonCamera } from './cartoonLook';
import type { VisualQuality } from './valeFinish';
import { DesktopQuality, type QualityMode } from './desktopQuality';
import { DEFAULT_WEATHER, type ValeWeather } from './weather';
import type { CityAnchor } from './siliconValley';
import { buildSpringfield } from './springfieldCity';
import { SPRINGFIELD_VIEW, type SpringfieldPlace } from './springfieldLocations';

export type ValeStage = 1 | 2 | 3 | 4 | 5;
export type LabelId = CityAnchor['id'];
export type SceneTime = 'real' | 'day' | 'night';

export interface ValeHandle {
  setStage(n: ValeStage): void;
  setWeather(w: ValeWeather): void;
  setLabel(id: LabelId, text: string): void;
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
  setQuality?(mode: QualityMode): void;
  setTimeOfDay?(mode: SceneTime): void;
  focusLocation?(key: string): void;
  overview?(): void;
}

/** Springfield fan recreation with financial destinations and adaptive desktop quality. */
export function createVale(canvas: HTMLCanvasElement, overlay: HTMLElement, initial: ValeStage = 1, onSelect?: (id: LabelId, place?: SpringfieldPlace) => void, onAssets?: (status: 'ready' | 'error') => void, onProgress?: (percent: number) => void, onQuality?: (tier: VisualQuality) => void): ValeHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  const quality = new DesktopQuality();
  let renderRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(renderRatio);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.06;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  let disposed = false;
  const city = buildSpringfield(scene, (loaded, total) => { if (!disposed) onProgress?.(Math.round(loaded / total * 100)); });
  let assetsReady = false;
  let weather: ValeWeather = DEFAULT_WEATHER;
  let timeOfDay: SceneTime = 'real';
  let precip: { pts: THREE.Points; kind: 'rain' | 'snow'; speed: number } | null = null;

  let weatherFogNear = 500, weatherFogFar = 1100;

  const paint = () => {
    const hour = new Date().getHours();
    const night = timeOfDay === 'night' || (timeOfDay === 'real' && (weather.tempC === null ? hour < 6 || hour >= 18 : !weather.isDay));
    const c = new THREE.Color('#79cfff');
    let fogNear = 500;
    let fogFar = 1100;
    switch (weather.kind) {
      case 'cloudy': c.lerp(new THREE.Color('#9aa7b3'), 0.45); break;
      case 'rain': c.lerp(new THREE.Color('#9aa7b3'), 0.65); fogNear = 160; fogFar = 360; break;
      case 'storm': c.lerp(new THREE.Color('#5d6875'), 0.8); fogNear = 120; fogFar = 300; break;
      case 'snow': c.lerp(new THREE.Color('#e8eef4'), 0.65); fogNear = 150; fogFar = 340; break;
      case 'fog': c.lerp(new THREE.Color('#c4ccd3'), 0.8); fogNear = 90; fogFar = 280; break;
      default: break;
    }
    if (night) {
      c.lerp(new THREE.Color('#0b1626'), 0.9);
    }
    cartoonNight.value = night ? 1 : 0;
    finish.setNight(night);
    fogNear *= 1.5; fogFar *= 1.5;
    weatherFogNear = fogNear; weatherFogFar = fogFar;
    renderer.shadowMap.needsUpdate = true;
    scene.background = c;
    scene.fog = new THREE.Fog(c, fogNear, fogFar);

  };

  const cam = createCartoonCamera();
  const finish = createCartoonFinish(renderer, scene, cam);

  // etiquetas HTML ancoradas nos prédios
  const labels = city.anchors.map((def) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', `Visitar ${def.name}`);
    el.addEventListener('click', () => onSelect?.(def.id, def.place));
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
  const th = SPRINGFIELD_VIEW.azimuth;
  const ph = SPRINGFIELD_VIEW.polar;
  let rad: number = SPRINGFIELD_VIEW.radius;
  let radT: number = SPRINGFIELD_VIEW.radius;
  const home = new THREE.Vector3(...SPRINGFIELD_VIEW.target);
  const tgt = home.clone();
  const panTarget = home.clone();
  let drag: { x: number; y: number } | null = null;
  let press: { x: number; y: number; moved: boolean } | null = null;
  const raycaster = new THREE.Raycaster();
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
    press = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const k = rad * (w < h ? .82 : .65) / Math.max(1, h);
    const vertical = k / Math.max(.2, Math.cos(ph));
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) press.moved = true;
    if (press?.moved) applyRatio(Math.min(1, renderRatio));
    panTarget.x += -Math.sin(th) * dx * k - Math.cos(th) * dy * vertical;
    panTarget.z += Math.cos(th) * dx * k - Math.sin(th) * dy * vertical;
    panTarget.x = Math.min(260, Math.max(-310, panTarget.x));
    panTarget.z = Math.min(260, Math.max(-310, panTarget.z));
    drag = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (e.type === 'pointerup' && press && !press.moved) {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), cam);
      const visible = city.buildings.filter(b => b.group.visible && b.scale > .9);
      const hit = raycaster.intersectObjects(visible.map(b => b.group), true)[0];
      if (hit) { const building = visible.find(b => b.group.getObjectById(hit.object.id)); if (building) onSelect?.(building.id, building.place); }
    }
    drag = null;
    press = null;
    applyRatio(renderRatio);
  };
  const clampRad = (v: number) => Math.min(1200, Math.max(38, v));
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
  function applyRatio(ratio: number) {
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    finish.resize(w, h, ratio);
  }
  const applyQuality = () => {
    renderRatio = quality.ratio(w, h, window.devicePixelRatio || 1);
    finish.setQuality(quality.tier); applyRatio(drag && press?.moved ? Math.min(1, renderRatio) : renderRatio);
    canvas.dataset.quality = quality.tier; onQuality?.(quality.tier);
  };
  const resize = () => {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    w = cw;
    h = ch;
    renderer.setSize(cw, ch, false);
    applyQuality();
    frameCartoonCamera(cam, rad, cw, ch);
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
  let readyAt = Infinity;
  let labelX = NaN, labelZ = NaN, labelRad = NaN, labelStage = -1, labelWidth = -1, labelHeight = -1;
  void city.ready.then(() => {
    if (disposed) return;
    assetsReady = true;
    readyAt = performance.now(); quality.reset();
    city.setStage(stage);
    for (const label of labels) label.pos.set(...label.def.position);
    labelStage = -1;
    renderer.shadowMap.needsUpdate = true;
    paint(); onAssets?.('ready');
  }).catch(() => { if (!disposed) onAssets?.('error'); });
  let raf = 0;
  let lightMinute = -1;
  let nextFrame = 0;
  renderer.info.autoReset = false;
  const v3 = new THREE.Vector3();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; nextFrame = now; quality.reset(); return; }
    const minute = Math.floor(Date.now() / 60000);
    if (minute !== lightMinute) { lightMinute = minute; paint(); }
    if (now < nextFrame - .5) return;
    nextFrame = Math.max(nextFrame + 1000 / 60, now + 1);
    const interval = now - last;
    const dt = Math.min(.1, interval / 1000);
    last = now;
    if (now - readyAt > 3000 && quality.sample(now, interval)) applyQuality();
    if (!reduce) elapsed += dt;
    if (!reduce && !drag) city.update(elapsed);
    rad += (radT - rad) * Math.min(1, dt * 8);
    tgt.lerp(panTarget, reduce ? 1 : 1 - Math.exp(-dt * 10));
    if (tgt.distanceToSquared(panTarget) < .000001) tgt.copy(panTarget);
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
    frameCartoonCamera(cam, rad, w, h);
    if (scene.fog instanceof THREE.Fog) { const overviewDistance = Math.max(0, rad - 300); scene.fog.near = weatherFogNear + overviewDistance; scene.fog.far = weatherFogFar + overviewDistance; }
    cam.updateMatrixWorld();
    renderer.info.reset(); finish.render();
    if (now - readyAt > 3000 && quality.fps > 0) {
      canvas.dataset.fps = quality.fps.toFixed(1);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
    }
    const moveLabels = labelX !== tgt.x || labelZ !== tgt.z || Math.abs(labelRad - rad) > .001 || !Number.isFinite(labelRad) || labelStage !== stage || labelWidth !== w || labelHeight !== h;
    if (!moveLabels) return;
    labelX = tgt.x; labelZ = tgt.z; labelRad = rad; labelStage = stage; labelWidth = w; labelHeight = h;
    for (const l of labels) {
      v3.copy(l.pos).project(cam);
      const locked = stage < l.def.min;
      l.el.classList.toggle('is-locked', locked); l.el.disabled = locked;
      l.info.textContent = l.text || l.def.place.purpose;
      const primary = ['garagem', 'compliance', 'conselho', 'cafe', 'banco', 'mercado', 'padaria'].includes(l.def.id);
      const show = assetsReady && (primary || rad < 260) && (rad < 390 || l.def.place.key === 'simpsons' || l.def.place.key === 'plant') && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
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
      for (const l of labels) if (l.def.id === id) { l.text = text; l.info.textContent = text; }
      labelStage = -1;
    },
    zoom(f) {
      radT = clampRad(radT * f);
    },
    reset() {
      panTarget.copy(home);
      radT = SPRINGFIELD_VIEW.radius;
    },
    focusLocation(key) { const building = city.buildings.find(b => b.place.key === key); if (building) { panTarget.set(building.group.position.x, 5, building.group.position.z); radT = building.place.isCharacter ? 80 : 140; } },
    overview() { panTarget.set(-35, 5, -35); radT = 1000; },
    setQuality(mode) { quality.setMode(mode); applyQuality(); },
    setTimeOfDay(mode) { timeOfDay = mode; paint(); },
    dispose() {
      disposed = true;
      city.cancel();
      city.people.dispose();
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
      finish.dispose();
      renderer.dispose();
    },
  };
}
