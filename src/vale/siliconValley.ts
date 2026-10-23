import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityKit, createWalkers } from './cityLife';
import { createSignals } from './cityTraffic';
import { buildDistrict } from './cityDistrict';
import { buildActivities } from './cityActivities';
import { createCarFleet } from './carFleet';

export interface CityBuilding { group: THREE.Group; min: number; scale: number; id: CityAnchor['id'] }
export interface CityCar { mesh: THREE.Group; axis: 'x' | 'z'; road: number; direction: number; position: number; speed: number }
export interface CityAnchor { id: 'garagem' | 'coworking' | 'escritorio' | 'campus' | 'torre' | 'compliance' | 'conselho' | 'cafe' | 'banco' | 'mercado' | 'padaria'; name: string; position: [number, number, number]; min: number }

// An original, geographically inspired neighborhood, not a surveyed street map.
export const CITY_ANCHORS: CityAnchor[] = [
  { id: 'garagem', name: 'Sua startup', position: [-17, 7.5, -15], min: 1 },
  { id: 'coworking', name: 'Coworking', position: [18, 10, -18], min: 2 },
  { id: 'escritorio', name: 'Escritório', position: [-18, 15, 19], min: 3 },
  { id: 'campus', name: 'Campus', position: [19, 12, 20], min: 4 },
  { id: 'torre', name: 'Sede', position: [57, 27, -18], min: 5 },
  { id: 'compliance', name: 'Compliance', position: [-58, 9, -17], min: 1 },
  { id: 'conselho', name: 'Conselho', position: [-58, 10, 18], min: 1 },
  { id: 'cafe', name: 'Café do Vale', position: [56, 7, 17], min: 1 },
  { id: 'banco', name: 'Banco do Vale', position: [-17, 12, 57], min: 1 },
  { id: 'mercado', name: 'Mercado', position: [18, 8, 58], min: 1 },
  { id: 'padaria', name: 'Padaria da Esquina', position: [60, 8, 59], min: 1 },
];

/** Physical materials, detailed architecture and instanced vegetation, all local. */
export function buildSiliconValley(scene: THREE.Scene) {
  const kit = cityKit();
  const parks: { group: THREE.Group; until: number }[] = [];
  let seed = 317;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const windows: THREE.MeshStandardMaterial[] = [];
  const buildings: CityBuilding[] = [];
  const cars: CityCar[] = [];
  const staticCity = new THREE.Group();
  const water = new THREE.Group();
  scene.add(water);
  scene.add(staticCity);
  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: THREE.ColorRepresentation, roughness = .85) => {
    const key = `${new THREE.Color(color).getHexString()}:${roughness}`;
    let mat = materialCache.get(key);
    if (!mat) { mat = new THREE.MeshStandardMaterial({ color, roughness }); materialCache.set(key, mat); }
    return mat;
  };

  function texture(kind: 'stucco' | 'roof' | 'wood' | 'asphalt' | 'grass' | 'concrete', color: string) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16000; i++) {
        const opacity = kind === 'grass' ? .025 : .075;
        ctx.fillStyle = random() > .5 ? `rgba(255,255,255,${random() * opacity})` : `rgba(0,0,0,${random() * opacity})`;
        ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
      }
      if (kind === 'roof') {
        for (let y = 0; y < 256; y += 16) {
          ctx.fillStyle = '#00000035'; ctx.fillRect(0, y, 256, 2);
          for (let x = (y % 32) ? -16 : 0; x < 256; x += 32) {
            ctx.fillRect(x, y, 1, 16);
            ctx.fillStyle = '#ffffff12'; ctx.fillRect(x + 2, y + 3, 28, 2);
          }
        }
      }
      if (kind === 'wood') {
        for (let y = 0; y < 256; y += 20) { ctx.fillStyle = '#00000030'; ctx.fillRect(0, y, 256, 2); ctx.fillStyle = '#ffffff22'; ctx.fillRect(0, y + 2, 256, 1); }
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(kind === 'grass' ? 12 : kind === 'asphalt' ? 5 : 1, kind === 'grass' ? 12 : kind === 'asphalt' ? 5 : 1);
    map.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map, roughness: kind === 'roof' ? .9 : 1, bumpMap: map, bumpScale: kind === 'grass' ? .04 : .015 });
  }
  const stucco = texture('stucco', '#e6e1d6');
  const siding = texture('wood', '#c8c9bc');
  const warmSiding = texture('wood', '#d9c7a9');
  const roof = texture('roof', '#535754');
  const tileRoof = texture('roof', '#9b614b');
  const asphalt = texture('asphalt', '#515758');
  const concrete = texture('concrete', '#c9c9be');
  const grass = texture('grass', '#839e6a');
  const white = material(0xe5e2d8);
  const timber = material(0x795e46);
  const steel = material(0x394548, .5);
  const silver = material(0xa1a8a6, .45);
  const glass = new THREE.MeshStandardMaterial({ color: 0x5f8692, metalness: .35, roughness: .22, emissive: 0xffd9a1, emissiveIntensity: 0 });
  windows.push(glass);
  const lit = new THREE.MeshStandardMaterial({ color: 0xffefc8, emissive: 0xffcf7e, emissiveIntensity: 0, roughness: .4 });
  windows.push(lit);
  const leaf = material(0xffffff);
  const palmMaterial = new THREE.MeshStandardMaterial({ color: 0x456947, roughness: .95, side: THREE.DoubleSide });
  const trunkMaterial = material(0x6e5d48);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeometry = new THREE.SphereGeometry(1, 10, 8);

  function block(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(boxGeometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = h > .3; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function cylinder(parent: THREE.Object3D, top: number, bottom: number, height: number, mat: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 12), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function branch(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number) {
    const delta = to.clone().sub(from);
    const mesh = cylinder(parent, radius * .55, radius, delta.length(), trunkMaterial, 0, 0, 0);
    mesh.position.copy(from).addScaledVector(delta, .5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }
  const foliage: { position: THREE.Vector3; scale: THREE.Vector3; color: THREE.Color; rotation: number }[] = [];
  function tree(x: number, z: number, size = 1, species: 'oak' | 'redwood' = 'oak') {
    const g = new THREE.Group(); g.position.set(x, .15, z); staticCity.add(g);
    const height = size * (species === 'redwood' ? 7 : 4.5);
    cylinder(g, .10 * size, .24 * size, height * .7, trunkMaterial, 0, height * .35, 0);
    const clusters = species === 'redwood' ? 16 : 12;
    for (let i = 0; i < clusters; i++) {
      const angle = i * 2.39996;
      const spread = species === 'redwood' ? (1 - i / clusters) * 1.3 : 1.2 * Math.sqrt(random());
      const dx = Math.cos(angle) * spread * size;
      const dz = Math.sin(angle) * spread * size;
      const y = species === 'redwood' ? height * .35 + i / clusters * height * .65 : height * .7 + (random() - .3) * 1.8 * size;
      if (i < 4) branch(g, new THREE.Vector3(0, height * .4, 0), new THREE.Vector3(dx, y, dz), .09 * size);
      foliage.push({ position: new THREE.Vector3(x + dx, y + .15, z + dz), scale: new THREE.Vector3((.7 + random() * .45) * size, (.65 + random() * .5) * size, (.7 + random() * .4) * size), rotation: random() * Math.PI, color: new THREE.Color().setHSL(species === 'redwood' ? .34 : .26 + random() * .07, .23 + random() * .14, .21 + random() * .12) });
    }
  }
  function palm(x: number, z: number, height = 8) {
    const g = new THREE.Group(); g.position.set(x, 0, z); staticCity.add(g);
    kit.tube(g, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(.15, height * .45, 0), new THREE.Vector3(.4, height, .15)], .17, 0x9c805e);
    for (let i = 1; i < 12; i++) {
      const collar = kit.ring(g, .175, .018, 0x8b7256, i * .035, height * i / 12, .015 * i); collar.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 3; i++) kit.ball(g, 0x987549, .4 + Math.cos(i * 2.1) * .2, height - .15, .15 + Math.sin(i * 2.1) * .2, .22);
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      const point = (t: number) => new THREE.Vector3(.4 + Math.cos(angle) * t * 4, height + Math.sin(t * Math.PI) * 1.25 - t * t * 1.1, .15 + Math.sin(angle) * t * 4);
      kit.tube(g, Array.from({ length: 7 }, (_, j) => point(j / 6)), .035, 0x7a8e47);
      for (let j = 1; j < 12; j++) for (const side of [-1, 1]) {
        const t = j / 13;
        const start = point(t - .04), end = point(t + .045), tip = point(Math.min(1, t + .12));
        tip.x += -Math.sin(angle) * side * Math.sin(t * Math.PI) * .7;
        tip.z += Math.cos(angle) * side * Math.sin(t * Math.PI) * .7;
        tip.y -= .15;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([...start.toArray(), ...end.toArray(), ...tip.toArray()], 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2)); geometry.computeVertexNormals();
        const blade = new THREE.Mesh(geometry, palmMaterial); blade.castShadow = true; g.add(blade);
      }
    }
  }
  function hedge(parent: THREE.Object3D, x: number, z: number, width: number) {
    block(parent, width, .4, .7, concrete, x, .3, z);
    // Separate overlapping crowns break up the silhouette of planted hedges.
    for (let i = 0; i < Math.ceil(width / .5); i++) {
      const mesh = new THREE.Mesh(sphereGeometry, material(i % 2 ? 0x526d42 : 0x607b4a));
      mesh.position.set(x - width / 2 + .25 + i * .5, .9 + random() * .1, z);
      mesh.scale.set(.48, .5, .45); mesh.castShadow = true; parent.add(mesh);
    }
  }
  function sign(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 3, background = '#334e43') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = '#f6f0df'; ctx.font = '500 48px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 65, 470); }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshStandardMaterial({ map, roughness: .8 }));
    mesh.position.set(x, y, z); parent.add(mesh);
  }
  function windowPane(parent: THREE.Object3D, x: number, y: number, z: number, w = 1.25, h = 1.5) {
    block(parent, w + .16, h + .16, .12, white, x, y, z);
    block(parent, w, h, .08, glass, x, y, z + .08);
    block(parent, .045, h, .1, steel, x, y, z + .14);
    block(parent, w, .045, .1, steel, x, y, z + .14);
    block(parent, w + .25, .1, .28, white, x, y - h / 2 - .1, z);
  }
  function gable(parent: THREE.Object3D, w: number, d: number, rise: number, y: number, mat: THREE.Material, cx = 0, cz = 0) {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(0, rise); shape.lineTo(w / 2, 0); shape.closePath();
    const end = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }), stucco);
    end.position.set(cx, y, cz - d / 2); end.castShadow = true; parent.add(end);
    const length = Math.hypot(w / 2 + .45, rise);
    for (const side of [-1, 1]) {
      const plane = block(parent, length, .15, d + .8, mat, cx + side * (w / 4 + .22), y + rise / 2, cz);
      plane.rotation.z = -side * Math.atan2(rise, w / 2 + .45);
    }
    block(parent, .15, .16, d + .85, mat, cx, y + rise + .08, cz);
  }
  function home(parent: THREE.Object3D, x: number, z: number, variant: number, startup = false) {
    const g = new THREE.Group(); g.position.set(x, .18, z); parent.add(g);
    const w = startup ? 8 : 7; const d = startup ? 7 : 6;
    block(g, w + .4, .3, d + .4, concrete, 0, .15, 0);
    block(g, w, 3.2, d, variant % 2 ? siding : warmSiding, 0, 1.9, 0);
    gable(g, w, d, 1.6, 3.5, variant % 3 ? roof : tileRoof);
    const garageX = startup ? 1.7 : 1.4;
    block(g, 3.1, 2.5, .14, white, garageX, 1.65, d / 2 + .1);
    for (let row = 0; row < 5; row++) {
      block(g, 2.96, .035, .07, silver, garageX, .55 + row * .48, d / 2 + .19);
      if (row === 4) for (let k = 0; k < 4; k++) block(g, .52, .28, .06, glass, garageX - 1 + k * .67, 2.65, d / 2 + .2);
    }
    windowPane(g, -2.1, 2, d / 2 + .09, 1.35, 1.4);
    block(g, 1, 2.3, .15, timber, -.5, 1.5, d / 2 + .15);
    block(g, .06, .12, .1, silver, -.2, 1.5, d / 2 + .27);
    block(g, 2.7, .12, 1.4, roof, -1.3, 3.1, d / 2 + .6);
    for (const px of [-2.6, 0]) block(g, .12, 2.8, .12, white, px, 1.6, d / 2 + 1.1);
    block(g, 3.5, .06, 6, concrete, garageX, .02, d / 2 + 3);
    block(g, .7, 1.5, .7, stucco, -2, 4.4, -1.8);
    for (let i = 0; i < 3; i++) {
      const panel = block(g, 1.8, .07, 1.4, glass, -.8 + i * 2, 4.2, 1.5); panel.rotation.x = .39;
    }
    if (startup) sign(g, 'GARAGEM / LAB 01', 1.3, 3.24, d / 2 + .3, 3);
    hedge(g, -3, 4.8, 1.5);
    block(g, .1, 1, .1, timber, -3.8, .5, 7);
    block(g, .6, .35, .4, steel, -3.8, 1.1, 7);
    return g;
  }
  function office(parent: THREE.Object3D, w: number, d: number, floors: number, accent = timber) {
    const h = floors * 3.1;
    kit.rounded(parent, w, h, d, 0xdce3df, 0, h / 2 + .2, 0, .6, .65);
    // Recessed glazing, mullions and projecting slabs give facades actual depth.
    for (const side of [-1, 1]) {
      const facade = new THREE.Group(); facade.rotation.y = side === 1 ? 0 : Math.PI; parent.add(facade);
      for (let floor = 0; floor < floors; floor++) {
        for (let x = -w / 2 + 1.2; x < w / 2 - .4; x += 1.65) {
          block(facade, 1.48, 2.2, .12, glass, x, floor * 3.1 + 1.7, d / 2 + .04);
          block(facade, .08, 2.4, .24, steel, x + .8, floor * 3.1 + 1.7, d / 2 + .13);
        }
        block(facade, w + .5, .18, .8, concrete, 0, floor * 3.1 + 3, d / 2 + .2);
      }
    }
    for (const side of [-1, 1]) {
      const wing = new THREE.Group(); wing.rotation.y = side * Math.PI / 2; parent.add(wing);
      for (let floor = 0; floor < floors; floor++) for (let x = -d / 2 + 1.3; x < d / 2 - .4; x += 2) windowPane(wing, x, floor * 3.1 + 1.7, w / 2 + .1, 1.5, 1.9);
    }
    block(parent, w + .4, .25, d + .4, steel, 0, h + .4, 0);
    for (const side of [-1, 1]) block(parent, w, .5, .16, concrete, 0, h + .7, side * d / 2);
    for (let i = 0; i < 3; i++) {
      block(parent, 1.4, .85, 1.6, silver, -w / 3 + i * w / 3, h + .9, -d / 4);
      block(parent, 1, .02, 1.2, steel, -w / 3 + i * w / 3, h + 1.34, -d / 4);
    }
    block(parent, 3.4, .22, 2.4, accent, 0, 3, d / 2 + .8);
    block(parent, 2.6, 2.6, .2, glass, 0, 1.55, d / 2 + .2);
    for (const x of [-w / 2 + .4, w / 2 - .4]) block(parent, .35, h, .4, accent, x, h / 2, d / 2 + .28);
    // Recessed roof terraces, sun fins and planted balconies soften repeated slabs.
    for (const side of [-1, 1]) {
      kit.rounded(parent, w + .6, .32, 1.2, 0xe8dec8, 0, h + .42, side * (d / 2 - .1), .12);
      for (const x of [-w / 3, 0, w / 3]) { kit.rounded(parent, 1.5, .45, .7, 0xa6937a, x, h + .75, side * (d / 2 - .3), .12); kit.ball(parent, 0x648557, x, h + 1.13, side * (d / 2 - .3), .65, .45, .4); }
    }
    if (floors >= 4) for (let floor = 2; floor < floors; floor += 3) {
      const balcony = kit.rounded(parent, w * .45, .2, 1.8, 0xd2bb97, w * .15, floor * 3.1, d / 2 + .6, .15);
      balcony.castShadow = true;
      kit.rounded(parent, w * .45, .55, .07, 0x8aabb0, w * .15, floor * 3.1 + .4, d / 2 + 1.4, .03, .25);
    }
    return h;
  }
  function parking(x: number, z: number, w = 14, d = 9) {
    block(staticCity, w, .045, d, asphalt, x, .09, z);
    for (let i = 0; i < Math.floor(w / 2.6); i++) {
      block(staticCity, .07, .012, 3.7, white, x - w / 2 + .5 + i * 2.6, .12, z - d / 2 + 2);
      block(staticCity, 1.7, .12, .2, concrete, x - w / 2 + 1.6 + i * 2.6, .17, z - d / 2 + .6);
    }
  }
  function car(color: number) {
    return kit.car(color, color % 2);
  }

  // Four continuous avenues and cross streets form walkable, occupied blocks.
  block(staticCity, 1000, .1, 1000, concrete, -120, -.08, 0);
  const roadPositions = [-80, -40, 0, 40, 80];
  for (const axis of ['x', 'z'] as const) for (const road of roadPositions) {
    const alongX = axis === 'x';
    block(staticCity, alongX ? 180 : 9, .13, alongX ? 9 : 180, concrete, alongX ? 0 : road, .02, alongX ? road : 0);
    block(staticCity, alongX ? 180 : 6.8, .045, alongX ? 6.8 : 180, asphalt, alongX ? 0 : road, .115, alongX ? road : 0);
    // Markings omit intersections, so no lines run through crosswalks.
    for (let p = -88; p < 90; p += 4) {
      if (roadPositions.some((r) => Math.abs(r - p) < 6)) continue;
      for (const offset of [-.14, .14]) block(staticCity, alongX ? 2.4 : .07, .012, alongX ? .07 : 2.4, material(0xd8c783), alongX ? p : road + offset, .145, alongX ? road + offset : p);
    }
  }
  for (const x of roadPositions) for (const z of roadPositions) {
    block(staticCity, 7, .02, 7, asphalt, x, .15, z);
    for (const side of [-1, 1]) for (let stripe = -2; stripe <= 2; stripe++) {
      block(staticCity, .5, .015, 1.8, white, x + stripe * 1.1, .17, z + side * 5.2);
      block(staticCity, 1.8, .015, .5, white, x + side * 5.2, .17, z + stripe * 1.1);
    }
  }
  const district = buildDistrict(staticCity, kit);
  windows.push(...district.windows);
  const activities = buildActivities(staticCity, scene, kit);
  // Pacific-inspired coast: a shaped sandy shoreline, promenade and open sea.
  function coastalSurface(inner: number, outer: number, mat: THREE.Material, y: number, parent: THREE.Group) {
    const shape = new THREE.Shape();
    for (let z = -500; z <= 500; z += 5) { const x = inner + Math.sin(z * .025) * 2.3; if (z === -500) shape.moveTo(x, -z); else shape.lineTo(x, -z); }
    shape.lineTo(outer, -500); shape.lineTo(outer, 500); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.receiveShadow = true; parent.add(mesh);
  }
  const sand = texture('concrete', '#dfc58f');
  coastalSurface(96, 400, sand, -.005, staticCity);
  const normalPixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    const u = x / 128 * Math.PI * 2, v = y / 128 * Math.PI * 2;
    const normal = new THREE.Vector3(Math.cos(u * 4 + Math.sin(v * 2)) * .35, Math.sin(v * 3 + Math.cos(u * 3)) * .3, 1).normalize();
    normalPixels[i] = Math.round((normal.x * .5 + .5) * 255); normalPixels[i + 1] = Math.round((normal.y * .5 + .5) * 255); normalPixels[i + 2] = Math.round((normal.z * .5 + .5) * 255); normalPixels[i + 3] = 255;
  }
  const seaNormals = new THREE.DataTexture(normalPixels, 128, 128);
  seaNormals.wrapS = seaNormals.wrapT = THREE.RepeatWrapping; seaNormals.repeat.set(.13, .13); seaNormals.needsUpdate = true;
  seaNormals.magFilter = THREE.LinearFilter; seaNormals.minFilter = THREE.LinearMipmapLinearFilter; seaNormals.generateMipmaps = true;
  const ocean = new THREE.MeshPhysicalMaterial({ color: 0x278ca5, roughness: .25, metalness: .15, clearcoat: .6, clearcoatRoughness: .25, normalMap: seaNormals, normalScale: new THREE.Vector2(.45, .45) });
  coastalSurface(113, 500, ocean, .015, water);
  coastalSurface(110.5, 116, new THREE.MeshStandardMaterial({ color: 0x68b6ba, roughness: .5, transparent: true, opacity: .65, depthWrite: false }), .035, water);
  block(staticCity, 2.8, .13, 680, concrete, 96, .08, 0);
  for (let z = -80; z < 90; z += 12) {
    palm(98, z, 7 + random());
    block(staticCity, .15, .5, 2.3, timber, 97.4, .8, z + 4);
    block(staticCity, .65, .15, 2.3, timber, 97.1, .55, z + 4);
    if (Math.abs(z + 3 + 54) < 11 || Math.abs(z + 3 - 64) < 11) continue;
    const parasol = new THREE.Group(); parasol.position.set(105 + random() * 2, 0, z + 3); staticCity.add(parasol);
    cylinder(parasol, .04, .04, 2.7, timber, 0, 1.35, 0);
    cylinder(parasol, .1, 1.5, .5, z % 24 ? white : material(0xcb7d59), 0, 2.8, 0);
    for (const side of [-1, 1]) block(parasol, .8, .15, 2.2, white, side, .3, 1.8);
  }
  // Dunes, beach kiosks, curved lounge chairs and surfboards create a lived-in coast.
  for (let i = 0; i < 12; i++) {
    const z = -72 + i * 13;
    kit.ball(staticCity, 0xe3c994, 100.5, .18, z, 2.5, .35, 3.4);
    for (let j = 0; j < 5; j++) kit.tube(staticCity, [new THREE.Vector3(100.5 + j * .22, .25, z), new THREE.Vector3(100.7 + j * .22, .9 + j % 2 * .3, z + .15), new THREE.Vector3(100.9 + j * .22, 1.05, z + .4)], .035, 0x9d9b57);
    if (Math.abs(z + 4 + 54) > 11 && Math.abs(z + 4 - 64) > 11) {
      const board = kit.ball(staticCity, i % 2 ? 0xd18165 : 0x709fa8, 105, .45, z + 4, .45, .12, 1.8); board.rotation.y = .3;
      kit.rounded(staticCity, .06, .03, 3, 0xf3ddad, 105, .58, z + 4, .01);
    }
  }
  for (const z of [-32, 28]) {
    const kiosk = new THREE.Group(); kiosk.position.set(99, .2, z); staticCity.add(kiosk);
    kit.rounded(kiosk, 3.2, 2.8, 3, z > 0 ? 0x8eada9 : 0xcf9a7c, 0, 1.4, 0, .3);
    kit.rounded(kiosk, 3.8, .32, 3.6, 0xf1d4a1, 0, 3, 0, .16);
    kit.rounded(kiosk, 2.6, 1.2, .12, 0x365964, 0, 1.8, 1.55, .14);
    kit.rounded(kiosk, 3, .15, .65, 0xdfbe8c, 0, 1.1, 1.7, .08);
    sign(kiosk, z > 0 ? 'SURF CLUB' : 'GELATO', 0, 2.85, 1.85, 2.8, '#927356');
  }
  // Boardwalk pier links directly to the eastbound avenue.
  block(staticCity, 37, .28, 5, timber, 111, .5, 0);
  for (let x = 94; x < 130; x += .65) block(staticCity, .06, .025, 5, material(0x9e815b), x, .66, 0);
  for (const z of [-2.4, 2.4]) for (let x = 96; x <= 128; x += 4) { cylinder(staticCity, .09, .12, 2.4, timber, x, .2, z); block(staticCity, 4.1, .1, .1, timber, x, 1.15, z); }
  const waves: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const points = Array.from({ length: 35 }, (_, j) => new THREE.Vector3(113 + i * 3 + Math.sin(j * .55 + i) * .5, .06, -110 + j * 6));
    const curve = new THREE.CatmullRomCurve3(points);
    const wave = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .035 + i * .004, 3, false), new THREE.MeshBasicMaterial({ color: 0xd8f4e9, transparent: true, opacity: .45 - i * .035 }));
    water.add(wave); waves.push(wave);
  }
  // Raised lifeguard cabin gives the beach a recognizable coastal landmark.
  const lifeguard = new THREE.Group(); lifeguard.position.set(105, 0, 46); staticCity.add(lifeguard);
  for (const x of [-1.3, 1.3]) for (const z of [-1.3, 1.3]) block(lifeguard, .16, 2, .16, white, x, 1, z);
  block(lifeguard, 3.2, .2, 3.2, timber, 0, 2, 0);
  block(lifeguard, 2.8, 1.8, 2.5, white, 0, 3, 0);
  block(lifeguard, 2.4, .85, .08, glass, 0, 3.15, 1.3);
  block(lifeguard, 3.5, .18, 3.1, material(0xb46f52), 0, 4, 0);
  for (let i = 0; i < 7; i++) block(lifeguard, 1.1, .17, .4, timber, 0, .25 + i * .25, 4 - i * .4);
  cylinder(lifeguard, .03, .03, 3, steel, -1.7, 4, 0);
  block(lifeguard, 1, .7, .025, material(0xc26d4c), -1.2, 5.1, 0);
  // Street furniture and mature tree lines create a coherent scale.
  for (const road of [-40, 0, 40]) for (let p = -68; p <= 68; p += 16) {
    const light = new THREE.Group(); light.position.set(p, 0, road + 4.1); staticCity.add(light);
    cylinder(light, .045, .09, 5.5, steel, 0, 2.75, 0);
    block(light, .1, .12, .8, steel, 0, 5.5, -.35);
    block(light, .35, .1, .7, lit, 0, 5.45, -.65);
    if (Math.abs(p % 40) > 7) tree(p, road - 6.5, .9 + random() * .3);
  }
  for (const x of [-40, 40]) for (const z of [-40, 0, 40]) {
    cylinder(staticCity, .06, .08, 3.3, steel, x + 4.1, 1.65, z + 4.1);
    sign(staticCity, 'Innovation Ave', x + 4.1, 3.1, z + 4.2, 3.2);
  }

  function headquarters(id: CityAnchor['id'], build: (g: THREE.Group) => void) {
    const anchor = CITY_ANCHORS.find((a) => a.id === id)!;
    const g = new THREE.Group(); g.position.set(anchor.position[0], .15, anchor.position[2]); scene.add(g);
    build(g); buildings.push({ group: g, min: anchor.min, scale: 0, id });
    return g;
  }
  headquarters('garagem', (g) => { home(g, 0, 0, 0, true); });
  // A home and garage belong to an actual residential parcel, with a backyard.
  home(staticCity, -29, -17, 1);
  tree(-27, -26, 1.2); tree(-11, -26, 1.25); tree(-8, -10, 1);
  block(staticCity, 24, .08, 1.1, concrete, -19, .1, -5.2);
  for (let i = 0; i < 24; i++) block(staticCity, .1, 1, .1, timber, -32 + i, .5, -28);
  block(staticCity, 24, .08, .1, timber, -20, .8, -28);
  headquarters('coworking', (g) => { office(g, 15, 10, 2); sign(g, 'FOUNDRY / WORKSPACE', 0, 4, 5.7, 7); hedge(g, -5, 8, 4); hedge(g, 5, 8, 4); });
  headquarters('escritorio', (g) => { office(g, 14, 11, 4, steel); sign(g, 'VENTURE HOUSE', 0, 3.8, 6.15, 5); });
  headquarters('campus', (g) => {
    const left = new THREE.Group(); left.position.set(-7, 0, 0); g.add(left); office(left, 8, 17, 3, steel);
    const right = new THREE.Group(); right.position.set(6, 0, -3); g.add(right); office(right, 10, 11, 2, steel);
    block(g, 7, 2.3, 2.2, glass, 0, 4.5, -4);
    block(g, 7.4, .16, 2.5, white, 0, 5.75, -4);
    block(g, 5, .12, 13, concrete, 0, .1, 3);
    for (let i = 0; i < 6; i++) block(g, 5, .13, .14, timber, 0, 2.8, 4 + i * .65);
    for (const x of [-2.35, 2.35]) for (const z of [4, 7.25]) block(g, .15, 2.8, .15, timber, x, 1.4, z);
    sign(g, 'THE CAMPUS', 6, 3.8, 3, 4);
  });
  headquarters('torre', (g) => { office(g, 12, 13, 7, steel); const penthouse = new THREE.Group(); penthouse.position.set(0, 22.2, 0); g.add(penthouse); office(penthouse, 8, 9, 1, steel); });
  headquarters('compliance', (g) => { office(g, 13, 9, 2); sign(g, 'FINANCE & LEGAL', 0, 3.9, 5.1, 6); });
  headquarters('conselho', (g) => { office(g, 12, 10, 2, steel); sign(g, 'ADVISORY HOUSE', 0, 4, 5.6, 6); });
  headquarters('cafe', (g) => {
    block(g, 11, 3.4, 7, stucco, 0, 1.9, 0); gable(g, 11, 7, 1.5, 3.6, tileRoof);
    for (const x of [-3.6, 0, 3.6]) windowPane(g, x, 1.8, 3.6, 2.7, 2.2);
    sign(g, 'THE DAILY / COFFEE', 0, 3.2, 3.78, 6);
    const awning = block(g, 11.5, .13, 2.2, timber, 0, 3, 4.3); awning.rotation.x = .1;
    block(g, 14, .08, 8, concrete, 0, .1, 7);
    for (const x of [-4, 0, 4]) {
      cylinder(g, .8, .8, .1, timber, x, 1, 7); cylinder(g, .05, .07, 1, steel, x, .5, 7);
      cylinder(g, .04, .04, 2.8, timber, x, 1.5, 7); cylinder(g, .12, 1.65, .55, white, x, 3, 7);
      for (const side of [-1, 1]) { block(g, .55, .1, .55, timber, x + side * 1.2, .65, 7); block(g, .1, .65, .55, timber, x + side * 1.4, .95, 7); }
    }
  });
  headquarters('banco', (g) => {
    office(g, 17, 13, 3, steel);
    const atrium = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 7.4, 32, 1, false, -Math.PI / 2, Math.PI), glass);
    atrium.position.set(0, 3.9, 6.5); atrium.castShadow = true; g.add(atrium);
    for (let i = -4; i <= 4; i++) { const a = i * Math.PI / 8; block(g, .09, 7.5, .09, white, Math.sin(a) * 4.55, 3.9, 6.5 + Math.cos(a) * 4.55); }
    block(g, 18, .5, 3.2, material(0x315b54), 0, 8.1, 7.2);
    sign(g, 'BANCO DO VALE', 0, 8.1, 8.86, 9, '#315b54');
    for (const x of [-6.5, 6.5]) { block(g, .4, 7.8, .4, white, x, 4, 8); hedge(g, x, 11, 3); }
    for (const x of [-6, 6]) { block(g, 1.3, 1.8, .6, steel, x, 1.2, 7); block(g, .8, .6, .05, glass, x, 1.55, 7.33); }
    block(g, 19, .15, 7, concrete, 0, .15, 9);
  });
  headquarters('mercado', (g) => {
    kit.rounded(g, 23, 4.6, 15, 0xf0dfbc, 0, 2.5, 0, .65);
    kit.rounded(g, 24, .55, 16, 0x477550, 0, 4.9, 0, .25);
    for (let x = -9; x <= 9; x += 3) windowPane(g, x, 2, 7.6, 2.5, 2.5);
    block(g, 23.5, .8, 2.3, material(0x477550), 0, 3.8, 8.2);
    sign(g, 'MERCADO / FRESH & LOCAL', 0, 3.9, 9.4, 14, '#477550');
    for (const side of [-1, 1]) {
      const facade = new THREE.Group(); facade.rotation.y = side * Math.PI / 2; g.add(facade);
      for (let x = -5; x <= 5; x += 2.5) windowPane(facade, x, 2, 11.6, 1.9, 2.3);
      sign(facade, 'FRESH MARKET', 0, 3.9, 11.7, 8, '#477550');
    }
    for (const x of [-6, 0, 6]) { kit.rounded(g, 3.6, .3, 4, 0xd8e4d8, x, 5.3, -1, .2); kit.rounded(g, 3, .12, 3.4, 0x7ca5a8, x, 5.5, -1, .1, .25); }
    kit.ball(g, 0xb95241, -2, 6.3, 7.7, .75); kit.ball(g, 0xd5a84e, 0, 6.3, 7.7, .8); kit.ball(g, 0x718e54, 2, 6.3, 7.7, .7);
    for (const x of [-8, -5, 5, 8]) { block(g, 2, .6, 1.2, timber, x, .55, 9.2); for (let i = 0; i < 6; i++) cylinder(g, .15, .18, .3, material(i % 2 ? 0xc48946 : 0x6e8e4c), x - .75 + i * .3, .95, 9.2); }
  });
  headquarters('padaria', (g) => {
    kit.rounded(g, 13, 4.1, 10, 0xe6c5a4, 0, 2.2, 0, .5);
    gable(g, 13, 10, 1.5, 4.3, tileRoof);
    for (const x of [-4, 0, 4]) windowPane(g, x, 2.1, 5.1, 3, 2.6);
    for (let i = 0; i < 13; i++) block(g, 1, .15, 2.2, i % 2 ? white : material(0xb96f51), -6 + i, 3.7, 5.7);
    sign(g, 'PADARIA DA ESQUINA', 0, 4.1, 5.3, 8, '#9a6147');
    kit.breadSign(g, 0, 6.7, 3.5);
    for (const side of [-1, 1]) {
      const facade = new THREE.Group(); facade.rotation.y = side * Math.PI / 2; g.add(facade);
      for (const x of [-2.5, 2.5]) windowPane(facade, x, 2, 6.6, 2.3, 2.5);
      sign(facade, 'PÃO / CAFÉ', 0, 3.9, 6.7, 5, '#9a6147');
    }
    block(g, 15, .1, 5, concrete, 0, .12, 8);
    for (const x of [-4, 4]) { cylinder(g, .8, .8, .1, timber, x, 1, 7.7); cylinder(g, .08, .08, .9, steel, x, .5, 7.7); hedge(g, x, 10, 2); }
  });
  // Every stage sits within an occupied district, never isolated on an empty lawn.
  parking(18, -8, 21, 7); parking(-18, 31, 22, 6); parking(-58, -7, 21, 7); parking(-58, 30, 20, 7); parking(57, -6, 22, 8);
  for (const [x, z] of [[10, -9], [16, -9], [23, -9], [-63, -8], [-55, -8], [52, -7], [-23, 30], [-16, 30]]) {
    const vehicle = car([0xf2eee4, 0x53636b, 0xa36753][Math.floor(random() * 3)]!); vehicle.position.set(x!, .15, z!); vehicle.rotation.y = Math.PI / 2; staticCity.add(vehicle);
  }
  for (const [i, x] of [-67, -54, -25, -13, 14, 27, 54, 67].entries()) {
    if (x < -40) home(staticCity, x, 59, i + 2);
    tree(x + 4, -49, .95); tree(x - 5, 70, 1.2);
  }
  // Southern California: low stucco, open courtyards, Art Deco and a selective skyline.
  district.landmark(-20, -61, 17, 16, 3, 0, 'courtyard');
  district.landmark(15, -60, 14, 17, 8, 1, 'artdeco');
  district.landmark(58, -61, 15, 16, 10, 2, 'glass');
  district.landmark(27, -55, 8, 10, 2, 3, 'spanish');
  district.landmark(70, -53, 8, 11, 2, 4, 'midcentury');
  // Street-facing infill occupies the edges of future startup parcels.
  for (const [x, z, name, color] of [[-29, 7, 'BOOKS & IDEAS', 0x886450], [6, 7, 'DESIGN STUDIO', 0x4c7777], [-70, 7, 'FLORISTA', 0x717c55], [69, -28, 'CYCLE SHOP', 0x9d7751]] as const) {
    const g = new THREE.Group(); g.position.set(x, .15, z); staticCity.add(g); office(g, 7, 5, 2, material(color)); sign(g, name, 0, 3.4, 3, 5);
  }
  // Occupied parks become startup plots only when that building is unlocked.
  for (const [x, z, until] of [[-18, 19, 3], [19, 20, 4], [57, -18, 5], [-60, -60, 6]] as const) parks.push({ group: kit.park(scene, x, z, until), until });
  // Linear park and redwoods replace the decorative circular lake and plaza.
  block(staticCity, 16, .035, 7, concrete, -19, .13, -31);
  for (const x of [-23, -16]) {
    block(staticCity, 2.3, .13, .65, timber, x, .65, -30);
    block(staticCity, 2.3, .55, .1, timber, x, .98, -30.35);
    for (const side of [-1, 1]) block(staticCity, .1, .55, .5, steel, x + side * .9, .35, -30);
  }
  for (const x of [9, 29]) for (const z of [7, 31]) { tree(x, z, 1.25); }
  for (const x of [-71, -48, 47, 70]) for (const z of [-28, 29, 49]) tree(x, z, 1.1 + random() * .3, 'redwood');
  for (const x of [7, 29, 48, 69]) palm(x, -28, 7 + random() * 2);

  const canopy = new THREE.InstancedMesh(sphereGeometry, leaf, foliage.length);
  const dummy = new THREE.Object3D();
  for (const [index, f] of foliage.entries()) {
    dummy.position.copy(f.position); dummy.scale.copy(f.scale); dummy.rotation.y = f.rotation; dummy.updateMatrix();
    canopy.setMatrixAt(index, dummy.matrix); canopy.setColorAt(index, f.color);
  }
  canopy.castShadow = true; canopy.receiveShadow = true;
  staticCity.add(canopy);

  for (let i = 0; i < 16; i++) {
    const mesh = car([0xe9e6df, 0x485a64, 0x9b5e49, 0xa4a999][i % 4]!); scene.add(mesh);
    cars.push({ mesh, axis: i % 2 ? 'x' : 'z', road: [-40, 0, 40][i % 3]!, direction: i % 4 < 2 ? 1 : -1, position: -78 + i * 10, speed: 4 + random() * 2 });
  }
  const signals = createSignals(staticCity, kit);
  const districtSolid = new THREE.MeshLambertMaterial({ vertexColors: true });
  const nearSolid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 });

  // Merge static architectural details by material to keep draw calls bounded.
  function batch(group: THREE.Group, castShadow = true) {
    group.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const originals = new Set<THREE.BufferGeometry>();
    const inverse = group.matrixWorld.clone().invert();
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || obj instanceof THREE.InstancedMesh || Array.isArray(obj.material)) return;
      const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      geo.applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
      let targetMaterial: THREE.Material = obj.material;
      const surface = obj.material as THREE.MeshStandardMaterial;
      const solid = !surface.map && (!castShadow || (surface.roughness >= .35 && !surface.metalness && !surface.emissive?.getHex() && !surface.userData.keepSeparate));
      if (solid) {
        const color = surface.color;
        const count = geo.getAttribute('position').count;
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        targetMaterial = castShadow ? nearSolid : districtSolid;
      }
      const list = batches.get(targetMaterial) ?? []; list.push(geo); batches.set(targetMaterial, list); originals.add(obj.geometry);
    });
    const keep: THREE.Object3D[] = [];
    group.traverse((obj) => { if (obj instanceof THREE.InstancedMesh) keep.push(obj); });
    for (const mesh of keep) group.attach(mesh);
    for (const child of [...group.children]) if (!keep.includes(child)) group.remove(child);
    for (const [mat, geometries] of batches) {
      // All builder primitives have position, normal and UV attributes.
      const geometry = mergeGeometries(geometries, false);
      if (geometry) { const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = castShadow; mesh.receiveShadow = castShadow; geometry.computeBoundingSphere(); group.add(mesh); }
      for (const geo of geometries) geo.dispose();
    }
    // Originals are shared builder primitives; dispose after every batch is complete.
    return originals;
  }
  const originals = new Set<THREE.BufferGeometry>();
  for (const group of [staticCity, ...buildings.map((b) => b.group), ...parks.map(p => p.group), ...cars.map(c => c.mesh)]) for (const geo of batch(group)) originals.add(geo);
  for (const group of district.chunks) for (const geo of batch(group, false)) originals.add(geo);
  // Geometry still used by cars or instanced foliage must stay alive.
  const retained = new Set<THREE.BufferGeometry>();
  scene.traverse((obj) => { if (obj instanceof THREE.Mesh) retained.add(obj.geometry); });
  for (const geo of originals) if (!retained.has(geo)) geo.dispose();
  const fleet = createCarFleet(scene, cars);
  const walkers = createWalkers(scene);
  const updateWater = (seconds: number) => { seaNormals.offset.set(seconds * .006, seconds * .003); };
  return { buildings, cars, windows, waves, parks, signals, walkers, updateWater, activities, fleet, districtBuildings: district.buildingCount, styles: district.styles };
}
