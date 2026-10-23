import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CityAnchor, CityBuilding } from './siliconValley';
import { createNordicTerrain, heightAt } from './nordicTerrain';

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
export const NORDIC_ANCHORS: CityAnchor[] = PLOTS.map(p => ({ id: p.id, name: p.name, position: [p.x, heightAt(p.x, p.z) + 11, p.z], min: p.min }));

/** Bake the artist's geometry and palette into one surface per model. */
export function bakeModel(source: THREE.Object3D, wall?: string) {
  source.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  source.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return;
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
      if (wall && /rooftiles/.test(name)) color.set('#47574a');
      if (name.includes('windows')) color.set('#b9c9bf');
      for (let i = group.start; i < Math.min(positions.count, group.start + group.count); i++) {
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }
    }
    for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(key)) geometry.deleteAttribute(key);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.clearGroups(); parts.push(geometry);
  });
  const result = mergeGeometries(parts);
  parts.forEach(p => p.dispose());
  if (!result) throw new Error('O modelo 3D não contém uma superfície compatível.');
  result.computeBoundingBox();
  const box = result.boundingBox!;
  result.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  return result;
}

function releaseSource(source: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  source.traverse(obj => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(m); } });
  for (const material of materials) { (material as THREE.MeshStandardMaterial).map?.dispose(); material.dispose(); }
}

/** Compact Nordic pilot. Local GLBs are loaded once; repeated props share geometry. */
export function buildNordicVale(scene: THREE.Scene, load = (name: string): Promise<{ scene: THREE.Group }> => new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/nordic/${name}.glb`)) {
  const root = new THREE.Group(); root.name = 'nordic-valley'; scene.add(root);
  root.add(createNordicTerrain());
  const buildings: CityBuilding[] = [];
  const windows: THREE.MeshStandardMaterial[] = [];
  let cancelled = false;
  const waterGeometry = new THREE.PlaneGeometry(440, 440, 88, 88); waterGeometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeometry, new THREE.MeshStandardMaterial({ color: '#426e77', roughness: .28, metalness: .22 }));
  water.position.y = -.25; water.name = 'fjord-water'; root.add(water);

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
  path([[-45, -88], [-15, -59], [10, -30], [10, 6], [12, 29]], 3.2);
  path([[-38, 5], [-14, 5], [10, 6], [33, 5]], 2.6);
  path([[-39, -19], [-15, -19], [10, -17], [35, -17]], 2.5);
  path([[-36, -35], [-12, -34], [10, -33], [32, -33]], 2.5);
  for (const plot of PLOTS) path([[plot.x, plot.z + 2], [plot.x, plot.z + 6], [plot.x < 0 ? -15 : 10, plot.z + 8]], 1.25);
  const wood = new THREE.MeshStandardMaterial({ color: '#7d6650', roughness: .9 });
  const deck = new THREE.InstancedMesh(new THREE.BoxGeometry(5, .25, .47), wood, 45);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.13, .16, 4, 8), wood, 16);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 45; i++) { matrix.makeTranslation(12, 1.15, 28 + i * .5); deck.setMatrixAt(i, matrix); }
  for (let i = 0; i < 16; i++) { matrix.makeTranslation(12 + (i % 2 ? 2.3 : -2.3), -.7, 29 + Math.floor(i / 2) * 2.9); posts.setMatrixAt(i, matrix); }
  deck.castShadow = deck.receiveShadow = true; posts.castShadow = true; root.add(deck, posts);

  const ready = (async () => {
    const names = ['house-a', 'house-b', 'house-c', 'lodge', 'market', 'bench', 'rock-a', 'rock-b', 'grass-large'] as const;
    const results = await Promise.allSettled(names.map(name => load(name)));
    if (cancelled || results.some(r => r.status === 'rejected')) {
      for (const result of results) if (result.status === 'fulfilled') releaseSource(result.value.scene);
      if (!cancelled) throw new Error('Não foi possível carregar as casas do Vale.');
      return;
    }
    const sources = new Map<string, THREE.Group>();
    results.forEach((r, i) => { if (r.status === 'fulfilled') sources.set(names[i]!, r.value.scene); });
    const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88 });
    const geometries = new Map<string, THREE.BufferGeometry>();
    function model(name: string, width: number, color?: string) {
      const key = `${name}:${color ?? ''}`;
      let geometry = geometries.get(key);
      if (!geometry) { geometry = bakeModel(sources.get(name)!, color); geometries.set(key, geometry); }
      geometry.computeBoundingBox();
      const mesh = new THREE.Mesh(geometry, surface);
      const scale = width / Math.max(.01, geometry.boundingBox!.max.x - geometry.boundingBox!.min.x);
      mesh.scale.setScalar(scale); mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    }
    try {
      for (const [i, plot] of PLOTS.entries()) {
        const mesh = model(plot.model, plot.width, plot.color);
        const group = new THREE.Group(); group.name = plot.id;
        group.position.set(plot.x, heightAt(plot.x, plot.z), plot.z); group.rotation.y = plot.turn ?? 0; group.add(mesh); root.add(group);
        buildings.push({ group, id: plot.id, min: plot.min, scale: 1 });
        const box = new THREE.Box3().setFromObject(group);
        NORDIC_ANCHORS[i]!.position[1] = box.max.y + 1.5;
      }
      // A few waterfront homes make the shore inhabited without a huge city.
      for (const [i, x] of [-30, -17, -5].entries()) {
        const house = model('house-a', 7, ['#954940', '#c9c2a6', '#657c72'][i]);
        house.position.set(x, heightAt(x, 29), 29); root.add(house);
      }
      for (const [x, z] of [[29, 1], [29, 7]]) { const stall = model('market', 4); stall.position.set(x!, heightAt(x!, z!), z!); root.add(stall); }
      for (const [x, z] of [[-13, 10], [5, 24], [18, 26], [-35, 6], [32, 11]]) { const bench = model('bench', 2.4); bench.position.set(x!, heightAt(x!, z!), z!); root.add(bench); }
      for (const [asset, count] of [['rock-a', 22], ['rock-b', 18], ['grass-large', 48]] as const) {
        const source = sources.get(asset)!; source.updateMatrixWorld(true);
        source.traverse(obj => {
          if (!(obj instanceof THREE.Mesh)) return;
          const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
          geometry.computeBoundingBox();
          const size = geometry.boundingBox!.getSize(new THREE.Vector3());
          const baseScale = (asset === 'grass-large' ? 1.8 : 3.2) / Math.max(size.x, size.z, .01);
          const original = obj.material as THREE.MeshStandardMaterial;
          const material = original.clone(); if (original.map) material.map = original.map.clone();
          const instances = new THREE.InstancedMesh(geometry, material, count);
          const transform = new THREE.Object3D();
          for (let i = 0; i < count; i++) {
            const z = asset === 'grass-large' ? -67 + (i * 17.31 % 100) : -85 + i * 5.4;
            const x = asset === 'grass-large' ? -53 + (i * 19.73 % 91) : 40 + Math.sin(z * .027) * 7;
            transform.position.set(x, heightAt(x, z) + .1, z);
            transform.rotation.y = i * 2.399;
            transform.scale.setScalar(baseScale * (.75 + (i % 5) * .15)); transform.updateMatrix(); instances.setMatrixAt(i, transform.matrix);
          }
          instances.receiveShadow = true; instances.castShadow = asset !== 'grass-large'; root.add(instances);
        });
      }
    } finally { for (const source of sources.values()) releaseSource(source); }
  })();
  function updateWater(seconds: number) {
    const positions = waterGeometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) positions.setY(i, Math.sin(positions.getX(i) * .13 + seconds * .45) * .08 + Math.cos(positions.getZ(i) * .19 - seconds * .3) * .04);
    positions.needsUpdate = true;
  }
  return { buildings, windows, ready, updateWater, cancel() { cancelled = true; } };
}
