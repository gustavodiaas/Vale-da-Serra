import * as THREE from 'three';
import { DesktopQuality, type QualityMode } from './desktopQuality';
import { DEFAULT_WEATHER, type ValeWeather } from './weather';
import type { VisualQuality } from './valeFinish';
import type { CityAnchor } from './siliconValley';
import type { SpringfieldPlace } from './springfieldLocations';
import { cartoonNight, createCartoonCamera } from './cartoonLook';
import { buildIllustratedSpringfield } from './illustratedSpringfield';
import { ART_WIDTH, ART_HEIGHT, ART_VIEW, fitIllustration } from './illustratedLayout';

export type ValeStage = 1 | 2 | 3 | 4 | 5;
export type LabelId = CityAnchor['id'];
export type SceneTime = 'real' | 'day' | 'night';
export interface ValeHandle {
  setStage(n: ValeStage): void; setWeather(w: ValeWeather): void; setLabel(id: LabelId, text: string): void;
  zoom(factor: number): void; reset(): void; dispose(): void;
  setQuality?(mode: QualityMode): void; setTimeOfDay?(mode: SceneTime): void;
  focusLocation?(key: string): void; overview?(): void;
}

/** The approved painting is rendered directly, without re-shading or inking it. */
export function createVale(canvas: HTMLCanvasElement, overlay: HTMLElement, initial: ValeStage = 1, onSelect?: (id: LabelId, place?: SpringfieldPlace) => void, onAssets?: (status: 'ready' | 'error') => void, onProgress?: (percent: number) => void, onQuality?: (tier: VisualQuality) => void): ValeHandle | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#6ca855');
  const camera = createCartoonCamera(); camera.up.set(0, 0, -1);
  const city = buildIllustratedSpringfield(scene, undefined, onProgress);
  const quality = new DesktopQuality(), reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false, loaded = false, stage: number = initial, time: SceneTime = 'real', weather: ValeWeather = DEFAULT_WEATHER;
  let radius: number = ART_VIEW.radius, targetRadius: number = ART_VIEW.radius, width = 1, height = 1, elapsed = 0, readyAt = Infinity;
  const home = new THREE.Vector3(...ART_VIEW.target), target = home.clone(), pan = home.clone();
  const progressKey = 'garagem:vale:unlocked:v1';
  try { stage = Math.max(initial, Math.min(5, Number(localStorage.getItem(progressKey)) || initial)); } catch { /* Storage is optional. */ }
  const labels = city.anchors.map(def => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'vale-label illustrated-label'; el.dataset.id = def.id;
    el.setAttribute('aria-label', 'Visitar ' + def.name); el.style.visibility = 'hidden';
    const name = document.createElement('b'), info = document.createElement('span'); name.textContent = def.name; el.append(name, info); overlay.appendChild(el);
    el.onclick = () => { city.select(def.place.key); onSelect?.(def.id, def.place); };
    return { def, el, info, text: '', pos: new THREE.Vector3(...def.position) };
  });
  function paint() {
    const hour = new Date().getHours(), night = time === 'night' || (time === 'real' && (weather.tempC === null ? hour < 6 || hour >= 18 : !weather.isDay));
    cartoonNight.value = night ? 1 : 0; city.setNight(night);
    scene.background = new THREE.Color(night ? '#364b39' : '#6ca855');
  }
  function applyQuality() {
    const ratio = quality.ratio(width, height, window.devicePixelRatio || 1);
    renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
    canvas.dataset.quality = quality.tier; onQuality?.(quality.tier);
  }
  function resize() {
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    applyQuality(); fitIllustration(camera, radius, width, height);
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize(); paint();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), projected = new THREE.Vector3();
  let press: { x: number; y: number; moved: boolean } | null = null, lastPointer = { x: 0, y: 0 };
  const clampZoom = (value: number) => Math.max(90, Math.min(1050, value));
  function down(event: PointerEvent) {
    if (event.button !== 0) return; canvas.setPointerCapture(event.pointerId);
    press = { x: event.clientX, y: event.clientY, moved: false }; lastPointer = { x: event.clientX, y: event.clientY };
  }
  function move(event: PointerEvent) {
    if (!press) return;
    press.moved ||= Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5;
    if (press.moved) {
      const units = radius * .65 / height;
      pan.x -= (event.clientX - lastPointer.x) * units; pan.z -= (event.clientY - lastPointer.y) * units;
      pan.x = THREE.MathUtils.clamp(pan.x, -ART_WIDTH * .48, ART_WIDTH * .48);
      pan.z = THREE.MathUtils.clamp(pan.z, -ART_HEIGHT * .48, ART_HEIGHT * .48);
    }
    lastPointer = { x: event.clientX, y: event.clientY };
  }
  function up(event: PointerEvent) {
    if (press && !press.moved && event.type === 'pointerup' && loaded) {
      const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(city.buildings.map(b => b.group), true)[0];
      const place = hit && city.buildings.find(b => b.group.getObjectById(hit.object.id))?.place;
      if (place) { city.select(place.key); onSelect?.(place.panel, place); }
    }
    press = null;
  }
  function wheel(event: WheelEvent) { event.preventDefault(); targetRadius = clampZoom(targetRadius * Math.exp(event.deltaY * .001)); }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('wheel', wheel, { passive: false });
  void city.ready.then(() => { if (disposed) return; loaded = true; readyAt = performance.now(); quality.reset(); city.setStage(stage); onAssets?.('ready'); }).catch(() => { if (!disposed) onAssets?.('error'); });
  let raf = 0, last = performance.now(), lastMinute = -1, nextFrame = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; nextFrame = now; quality.reset(); return; }
    if (now < nextFrame - .5) return;
    nextFrame = Math.max(nextFrame + 1000 / 60, now + 1);
    const interval = now - last, dt = Math.min(.1, interval / 1000); last = now;
    if (now - readyAt > 3000 && quality.sample(now, interval)) applyQuality();
    const minute = Math.floor(Date.now() / 60000); if (minute !== lastMinute) { lastMinute = minute; paint(); }
    if (!reduce) elapsed += dt;
    if (!press) city.update(elapsed);
    radius += (targetRadius - radius) * (reduce ? 1 : Math.min(1, dt * 8));
    target.lerp(pan, reduce ? 1 : 1 - Math.exp(-dt * 10));
    camera.position.set(target.x, 600, target.z); camera.lookAt(target.x, 0, target.z);
    fitIllustration(camera, radius, width, height); camera.updateMatrixWorld();
    renderer.render(scene, camera);
    if (quality.fps > 0) { canvas.dataset.fps = quality.fps.toFixed(1); canvas.dataset.drawCalls = String(renderer.info.render.calls); canvas.dataset.triangles = String(renderer.info.render.triangles); }
    for (const label of labels) {
      projected.copy(label.pos).project(camera);
      const show = loaded && (label.def.place.key === 'simpsons' || radius < 580) && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
      label.el.style.visibility = show ? 'visible' : 'hidden'; label.info.textContent = label.text;
      if (show) label.el.style.transform = 'translate(' + ((projected.x * .5 + .5) * width).toFixed(1) + 'px,' + ((-.5 * projected.y + .5) * height).toFixed(1) + 'px) translate(-50%,-100%)';
    }
  }
  raf = requestAnimationFrame(frame);
  return {
    setStage(value) { stage = Math.max(stage, value); city.setStage(stage); try { localStorage.setItem(progressKey, String(stage)); } catch { /* Optional. */ } },
    setWeather(value) { weather = value; paint(); },
    setLabel(id, text) { for (const label of labels) if (label.def.id === id) label.text = text; },
    zoom(factor) { targetRadius = clampZoom(targetRadius * factor); },
    reset() { pan.copy(home); targetRadius = ART_VIEW.radius; },
    focusLocation(key) { const b = city.buildings.find(b => b.place.key === key); if (b) { pan.set(b.group.position.x, 0, b.group.position.z); targetRadius = b.place.isCharacter ? 180 : Math.max(230, b.place.width * 3.2); city.select(key); } },
    overview() { pan.set(-35, 0, 0); targetRadius = Math.max(ART_HEIGHT / .65, ART_WIDTH / (width / height) / .65) * 1.08; },
    setQuality(mode) { quality.setMode(mode); applyQuality(); }, setTimeOfDay(mode) { time = mode; paint(); },
    dispose() {
      disposed = true; city.cancel(); city.people.dispose(); cancelAnimationFrame(raf); observer.disconnect();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('wheel', wheel);
      labels.forEach(l => l.el.remove());
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      scene.traverse(object => { if (!(object instanceof THREE.Mesh)) return; geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) { materials.add(material); const map = (material as THREE.MeshBasicMaterial).map; if (map) textures.add(map); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose();
    },
  };
}
