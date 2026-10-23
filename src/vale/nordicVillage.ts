import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CityAnchor, CityBuilding } from './siliconValley';
import { createNordicTerrain, heightAt, villagePosition, VILLAGE_LAYOUT } from './nordicTerrain';
import { createCottageGardens } from './cottageGardens';
import { createFjordWater } from './fjordWater';
import { createFjordBoats } from './fjordBoats';
import { createVillageResidents, type VillageVisit } from './villageResidents';
import { createConstructionSite } from './villageConstruction';
import { addVegetationWind } from './vegetationWind';

type House = 'house-a' | 'house-b' | 'house-c' | 'lodge';
type Plot = { id: CityAnchor['id']; name: string; x: number; z: number; model: House; width: number; color: string; min: number; turn?: number };
const PLOTS: Plot[] = [
  { id: 'garagem', name: 'Sua startup', x: -2, z: -9, model: 'house-b', width: 11, color: '#954940', min: 1 },
  { id: 'coworking', name: 'Casa das Ideias', x: -25, z: -27, model: 'house-c', width: 12, color: '#c9c2a6', min: 2 },
  { id: 'escritorio', name: 'Escritório', x: -2, z: -43, model: 'house-b', width: 11, color: '#748675', min: 3 },
  { id: 'campus', name: 'Campus do Vale', x: -25, z: -46, model: 'lodge', width: 14, color: '#b7a77e', min: 4 },
  { id: 'torre', name: 'Sede do Vale', x: 21, z: -43, model: 'lodge', width: 14, color: '#aa5143', min: 5 },
  { id: 'compliance', name: 'Contas fixas', x: -26, z: -8, model: 'house-b', width: 10, color: '#d1cdb9', min: 1 },
  { id: 'conselho', name: 'Conselho', x: 23, z: -24, model: 'house-a', width: 10, color: '#5e777d', min: 1 },
  { id: 'cafe', name: 'Café do Fiorde', x: 24, z: 18, model: 'house-a', width: 9, color: '#a05242', min: 1 },
  { id: 'banco', name: 'Banco do Vale', x: -25, z: 16, model: 'lodge', width: 12, color: '#d3c7a6', min: 1 },
  { id: 'mercado', name: 'Mercado do Porto', x: 22, z: -6, model: 'house-c', width: 12, color: '#536e64', min: 1 },
  { id: 'padaria', name: 'Padaria do Vale', x: -2, z: 17, model: 'house-b', width: 10, color: '#be7856', min: 1 },
];
for (const plot of PLOTS) [plot.x, plot.z] = villagePosition(plot.x, plot.z);
export const NORDIC_ANCHORS: CityAnchor[] = PLOTS.map(p => ({ id: p.id, name: p.name, position: [p.x, heightAt(p.x, p.z) + 11, p.z], min: p.min }));

/** Bake the artist's geometry and palette into one surface per model. */
export function bakeModel(source: THREE.Object3D, wall?: string, part: 'body' | 'windows' | 'all' = 'all') {
  source.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(source);
  const parts: THREE.BufferGeometry[] = [];
  source.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return;
    const surfaces: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    const windowSurface = surfaces.every(m => m.name.toLowerCase().includes('windows'));
    if ((part === 'body' && windowSurface) || (part === 'windows' && !windowSurface)) return;
    const geometry = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    geometry.applyMatrix4(obj.matrixWorld);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const materials: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: positions.count, materialIndex: 0 }];
    for (const group of groups) {
      const material = materials[group.materialIndex ?? 0] as THREE.MeshStandardMaterial;
      const name = material.name.toLowerCase();
      const color = material.color.clone();
      if (wall && /plaster|beige|wood_side/.test(name)) color.set(wall);
      if (wall && /rooftiles/.test(name)) color.set(wall === '#d1cdb9' || wall === '#c9c2a6' ? '#9b6250' : wall === '#536e64' ? '#555e65' : '#58654b');
      if (wall && name === 'wood') color.set('#795944');
      if (wall && name === 'wood_light') color.set('#e3cfa6');
      if (name.includes('windows')) color.set('#ffe0a5');
      for (let i = group.start; i < Math.min(positions.count, group.start + group.count); i++) {
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }
    }
    for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(key)) geometry.deleteAttribute(key);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.clearGroups(); parts.push(geometry);
  });
  if (!parts.length) return new THREE.BufferGeometry();
  const result = mergeGeometries(parts);
  parts.forEach(p => p.dispose());
  if (!result) throw new Error('O modelo 3D não contém uma superfície compatível.');
  const box = sourceBounds;
  result.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  return result;
}

function releaseSource(source: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  source.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(m); } });
  for (const material of materials) { (material as THREE.MeshStandardMaterial).map?.dispose(); material.dispose(); }
}

/** Compact Nordic pilot. Local GLBs are loaded once; repeated props share geometry. */
export function buildNordicVale(scene: THREE.Scene, load = (name: string): Promise<{ scene: THREE.Group }> => new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/nordic/${name}.glb`), onProgress?: (loaded: number, total: number) => void) {
  const root = new THREE.Group(); root.name = 'nordic-valley'; scene.add(root);
  root.add(createNordicTerrain());
  const buildings: CityBuilding[] = [];
  const windows: THREE.MeshStandardMaterial[] = [];
  const constructionSites: { group: THREE.Group; min: number }[] = [];
  const headquarters: { group: THREE.Group; min: number }[] = [];
  let cancelled = false;
  const water = createFjordWater(); root.add(water.mesh);
  const boats = createFjordBoats(root);
  let residents: ReturnType<typeof createVillageResidents> | undefined;
  let peopleFrame = -1;
  const windClock = { value: 0 };

  // Narrow paths follow the terrain instead of covering the valley with city blocks.
  const pathMaterial = new THREE.MeshStandardMaterial({ color: '#a8a48c', roughness: 1 });
  function path(points: [number, number][], width: number) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const vertices: number[] = [], indices: number[] = [];
    const segments = 90;
    for (let i = 0; i <= segments; i++) {
      const point = curve.getPoint(i / segments), tangent = curve.getTangent(i / segments);
      for (const side of [-1, 1]) { const x = point.x - tangent.z * side * width / 2, z = point.z + tangent.x * side * width / 2; vertices.push(x, heightAt(x, z) + .065, z); }
      if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, pathMaterial); mesh.receiveShadow = true; root.add(mesh);
  }
  path([[13.5, -91], [13.5, -48], [13.5, -8], [13.5, 28], [13.5, 52]], 3.2);
  const wood = new THREE.MeshStandardMaterial({ color: '#7d6650', roughness: .9 });
  const deck = new THREE.InstancedMesh(new THREE.BoxGeometry(5, .25, .47), wood, 45);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.13, .16, 4, 8), wood, 16);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 45; i++) { matrix.makeTranslation(13.5, 2, 51 + i * .5); deck.setMatrixAt(i, matrix); }
  for (let i = 0; i < 16; i++) { matrix.makeTranslation(13.5 + (i % 2 ? 2.3 : -2.3), 0, 52 + Math.floor(i / 2) * 2.9); posts.setMatrixAt(i, matrix); }
  deck.castShadow = deck.receiveShadow = true; posts.castShadow = true; root.add(deck, posts);

  const ready = (async () => {
    const names = ['house-a', 'house-b', 'house-c', 'lodge', 'market', 'bench', 'rock-a', 'rock-b', 'grass-large', 'tree'] as const;
    let loaded = 0; onProgress?.(0, names.length);
    const results = await Promise.allSettled(names.map(async name => { try { return await load(name); } finally { onProgress?.(++loaded, names.length); } }));
    if (cancelled || results.some(r => r.status === 'rejected')) {
      for (const result of results) if (result.status === 'fulfilled') releaseSource(result.value.scene);
      if (!cancelled) throw new Error('Não foi possível carregar as casas do Vale.');
      return;
    }
    const sources = new Map<string, THREE.Group>();
    results.forEach((r, i) => { if (r.status === 'fulfilled') sources.set(names[i]!, r.value.scene); });
    const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffe0a5', emissive: '#ffbb68', emissiveIntensity: .18, roughness: .45 }); windows.push(glow);
    const geometries = new Map<string, THREE.BufferGeometry>();
    function model(name: string, width: number, color?: string) {
      const key = `${name}:${color ?? ''}`;
      let geometry = geometries.get(key);
      if (!geometry) { geometry = bakeModel(sources.get(name)!, color, color ? 'body' : 'all'); geometries.set(key, geometry); }
      geometry.computeBoundingBox();
      const mesh = new THREE.Mesh(geometry, surface);
      const scale = width / Math.max(.01, geometry.boundingBox!.max.x - geometry.boundingBox!.min.x);
      mesh.castShadow = mesh.receiveShadow = true;
      const group = new THREE.Group(); group.add(mesh); group.scale.set(scale, scale * (color ? .88 : 1), scale);
      if (color) {
        const windowKey = `${name}:windows`;
        let panes = geometries.get(windowKey);
        if (!panes) { panes = bakeModel(sources.get(name)!, undefined, 'windows'); geometries.set(windowKey, panes); }
        if (panes.getAttribute('position')) group.add(new THREE.Mesh(panes, glow));
      }
      return group;
    }
    try {
      const gardens: { x: number; front: number; width: number }[] = [];
      const visits: VillageVisit[] = [];
      const footprints: { x: number; z: number; width: number; depth: number }[] = [];
      for (const [i, plot] of PLOTS.entries()) {
        const mesh = model(plot.model, plot.width, plot.color);
        const group = new THREE.Group(); group.name = plot.id;
        group.position.set(plot.x, heightAt(plot.x, plot.z), plot.z); group.rotation.y = plot.turn ?? 0; group.add(mesh); root.add(group);
        if (plot.min > 1) {
          const work = createConstructionSite(plot.width + 2, 12); work.position.copy(group.position); work.name = `worksite-${plot.id}`;
          root.add(work); constructionSites.push({ group: work, min: plot.min });
        }
        if (plot.id === 'garagem') {
          for (const [name, width, x, z, min] of [['house-b', 6.5, -9, -1, 3], ['house-c', 7.2, -9, -11, 5]] as const) {
            const annex = model(name, width, '#c9c2a6'); annex.position.set(x, 0, z); annex.name = `headquarters-annex-${min}`;
            group.add(annex); headquarters.push({ group: annex, min });
          }
        }
        buildings.push({ group, id: plot.id, min: plot.min, scale: 1 });
        const box = new THREE.Box3().setFromObject(group);
        NORDIC_ANCHORS[i]!.position[1] = box.max.y + 1.5;
        const front = box.max.z + 2;
        path([[plot.x, box.max.z - .5], [plot.x, front], [13.5, front]], 1.4);
        if (plot.min === 1) gardens.push({ x: plot.x, front: box.max.z + .75, width: plot.width });
        if (plot.min === 1) visits.push({ x: plot.x, front, door: box.max.z - .2, kind: plot.id });
        if (plot.min === 1) footprints.push({ x: plot.x, z: plot.z, width: plot.width + 2, depth: box.max.z - box.min.z + 2 });
      }
      // A few waterfront homes make the shore inhabited without a huge city.
      for (const [i, x] of [-43, -25, -7].entries()) {
        const house = model('house-b', 8, ['#954940', '#c9c2a6', '#657c72'][i]);
        house.position.set(x, heightAt(x, 41), 41); root.add(house);
        const box = new THREE.Box3().setFromObject(house);
        gardens.push({ x, front: box.max.z + .75, width: 8 });
        footprints.push({ x, z: 41, width: 10, depth: box.max.z - box.min.z + 2 });
      }
      path([[-48, 48], [-24, 48], [-4, 48], [13.5, 48], [37, 47]], 2.1);
      for (const [x, z] of [[43, 1], [43, 8]]) { const stall = model('market', 4); stall.position.set(x!, heightAt(x!, z!), z!); root.add(stall); }
      for (const [x, z] of [[-17, 13], [7, 34], [24, 39], [-47, 8], [43, 19]]) { const bench = model('bench', 2.4); bench.position.set(x!, heightAt(x!, z!), z!); root.add(bench); }
      createCottageGardens(root, gardens, glow);
      const pixels = new Uint8Array(64 * 64 * 4);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4, radius = Math.hypot((x - 31.5) / 32, (y - 31.5) / 32);
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255; pixels[i + 3] = Math.round(Math.max(0, 1 - radius) ** 1.5 * 255);
      }
      const shade = new THREE.DataTexture(pixels, 64, 64); shade.minFilter = shade.magFilter = THREE.LinearFilter; shade.needsUpdate = true;
      const shadowGeometry = new THREE.PlaneGeometry(1, 1); shadowGeometry.rotateX(-Math.PI / 2);
      const contacts = new THREE.InstancedMesh(shadowGeometry, new THREE.MeshBasicMaterial({ map: shade, color: '#29472e', opacity: .32, transparent: true, depthWrite: false }), footprints.length);
      const contact = new THREE.Object3D();
      footprints.forEach((footprint, i) => { contact.position.set(footprint.x, heightAt(footprint.x, footprint.z) + .035, footprint.z); contact.scale.set(footprint.width * 1.4, 1, footprint.depth * 1.4); contact.updateMatrix(); contacts.setMatrixAt(i, contact.matrix); });
      contacts.name = 'cottage-contact-shadows'; root.add(contacts);
      residents = createVillageResidents(root, visits);
      const trees = [[-55, -57], [-59, -39], [-54, -18], [-60, 3], [-55, 25], [-49, 37], [-38, -73], [-14, -76], [37, -68], [45, 27]];
      const treeSource = sources.get('tree')!; treeSource.updateMatrixWorld(true);
      treeSource.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return;
        const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld); geometry.computeBoundingBox();
        const box = geometry.boundingBox!, h = box.max.y - box.min.y;
        const positions = geometry.getAttribute('position'), colors = new Float32Array(positions.count * 3);
        const green = new THREE.Color('#66875b'), bark = new THREE.Color('#8a7053');
        for (let i = 0; i < positions.count; i++) { const c = (positions.getY(i) - box.min.y) / h < .34 ? bark : green; colors.set([c.r, c.g, c.b], i * 3); }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
        addVegetationWind(material, windClock, box.min.y, h);
        const instances = new THREE.InstancedMesh(geometry, material, trees.length);
        const transform = new THREE.Object3D();
        trees.forEach(([x, z], i) => { const scale = (5.2 + i % 3) / h; transform.position.set(x!, heightAt(x!, z!) - box.min.y * scale, z!); transform.rotation.y = i * 2.4; transform.scale.setScalar(scale); transform.updateMatrix(); instances.setMatrixAt(i, transform.matrix); });
        instances.castShadow = instances.receiveShadow = true; root.add(instances);
      });
      for (const [asset, count] of [['rock-a', 22], ['rock-b', 18], ['grass-large', 48]] as const) {
        const source = sources.get(asset)!; source.updateMatrixWorld(true);
        source.traverse(obj => {
          if (!(obj instanceof THREE.Mesh)) return;
          const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
          geometry.computeBoundingBox();
          const size = geometry.boundingBox!.getSize(new THREE.Vector3());
          const baseScale = (asset === 'grass-large' ? 1.8 : 3.2) / Math.max(size.x, size.z, .01);
          const original = obj.material as THREE.MeshStandardMaterial;
          const material = original.clone(); material.map = null; material.vertexColors = false;
          material.color.set(asset === 'grass-large' ? '#79925b' : '#969b89'); material.roughness = 1;
          if (asset === 'grass-large') addVegetationWind(material, windClock, geometry.boundingBox!.min.y, size.y);
          const instances = new THREE.InstancedMesh(geometry, material, count);
          const transform = new THREE.Object3D();
          for (let i = 0; i < count; i++) {
            const z = asset === 'grass-large' ? -80 + (i * 17.31 % 128) : -85 + i * 6.2 + Math.sin(i * 2.4) * 3;
            const x = asset === 'grass-large' ? -78 + (i * 19.73 % 130) : VILLAGE_LAYOUT.bankX - 1 + Math.sin(z * .027) * 7 + Math.sin(z * .059) * 2 + Math.sin(i * 1.7) * 2;
            transform.position.set(x, heightAt(x, z) + .1, z);
            transform.rotation.y = i * 2.399;
            transform.scale.setScalar(baseScale * (.75 + (i % 5) * .15)); transform.updateMatrix(); instances.setMatrixAt(i, transform.matrix);
          }
          instances.receiveShadow = true; instances.castShadow = asset !== 'grass-large'; root.add(instances);
        });
      }
    } finally { for (const source of sources.values()) releaseSource(source); }
  })();
  function update(seconds: number) {
    windClock.value = seconds;
    water.update(seconds); boats.update(seconds);
    const frame = Math.floor(seconds * 15);
    if (frame !== peopleFrame) { residents?.update(seconds); peopleFrame = frame; }
  }
  function setStage(stage: number) {
    for (const site of constructionSites) site.group.visible = stage < site.min;
    for (const annex of headquarters) annex.group.visible = stage >= annex.min;
  }
  return { buildings, windows, ready, update, setStage, constructionSites, boats, get residents() { return residents; }, cancel() { cancelled = true; } };
}
