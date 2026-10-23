import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BEACH_TOWELS, VOLLEY_COURTS } from './cityActivities';

/** Sculpted miniature assets: rounded silhouettes, layered materials and real depth. */
export function cityKit() {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries = new Map<string, THREE.BufferGeometry>();
  const mat = (color: number, roughness = .55, metalness = 0) => {
    const key = `${color}:${roughness}:${metalness}`;
    let result = materials.get(key);
    if (!result) { result = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.set(key, result); }
    return result;
  };
  const geo = (key: string, create: () => THREE.BufferGeometry) => { let result = geometries.get(key); if (!result) { result = create(); geometries.set(key, result); } return result; };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const rounded = (p: THREE.Object3D, w: number, h: number, d: number, color: number, x: number, y: number, z: number, radius = .12, roughness = .55) => mesh(p, geo(`r:${w}:${h}:${d}:${radius}`, () => new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 2, h / 2, d / 2))), mat(color, roughness), x, y, z);
  const ball = (p: THREE.Object3D, color: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => { const m = mesh(p, geo('sphere', () => new THREE.SphereGeometry(1, 10, 8)), mat(color), x, y, z); m.scale.set(sx, sy, sz); return m; };
  const tube = (p: THREE.Object3D, points: THREE.Vector3[], radius: number, color: number) => mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, radius, 6, false), mat(color));
  const ring = (p: THREE.Object3D, radius: number, thickness: number, color: number, x: number, y: number, z: number) => mesh(p, geo(`torus:${radius}:${thickness}`, () => new THREE.TorusGeometry(radius, thickness, 7, 20)), mat(color, .4, .3), x, y, z);
  function car(color: number, variant = 0) {
    const g = new THREE.Group();
    g.userData.model = `${color}:${variant % 2}`;
    const paint = mat(color, .26, .25), dark = mat(0x182d39, .18, .35), trim = mat(0xd5dedc, .3, .65);
    rounded(g, 3.95, .65, 1.76, color, 0, .66, 0, .25, .26);
    rounded(g, 3.6, .18, 1.68, 0x293840, 0, .38, 0, .07);
    // A continuous side profile creates the sloped windscreen and rear hatch.
    const profile = new THREE.Shape();
    profile.moveTo(-1.35, .87); profile.lineTo(-.94, 1.56 + (variant % 2) * .12); profile.quadraticCurveTo(-.75, 1.75, -.5, 1.77);
    profile.lineTo(.38, 1.77); profile.quadraticCurveTo(.55, 1.74, .7, 1.58); profile.lineTo(1.2, .95); profile.closePath();
    const cabin = geo(`cabin:${variant % 2}`, () => new THREE.ExtrudeGeometry(profile, { depth: 1.35, bevelEnabled: true, bevelSize: .09, bevelThickness: .08, bevelSegments: 3, steps: 1, curveSegments: 8 }));
    mesh(g, cabin, dark, 0, 0, -.675);
    rounded(g, 1.15, .09, 1.3, color, -.12, 1.79, 0, .04, .25);
    for (const side of [-1, 1]) {
      rounded(g, .07, .73, .08, color, -.16, 1.36, side * .76, .03);
      rounded(g, .13, .12, .25, color, .69, 1.03, side * .98, .05);
      rounded(g, .26, .045, .04, 0xbac7c8, -.4, .87, side * .89, .015);
      rounded(g, .26, .045, .04, 0xbac7c8, .65, .87, side * .89, .015);
      rounded(g, 1.7, .025, .025, 0x83959b, -.2, .45, side * .895, .01);
      for (const x of [-1.23, 1.2]) {
        const wheel = ring(g, .275, .12, 0x20292d, x, .4, side * .87);
        wheel.material = mat(0x20292d, .9);
        const hub = mesh(g, geo('hub', () => new THREE.CylinderGeometry(.22, .22, .06, 16)), trim, x, .4, side * .97); hub.rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const spoke = rounded(g, .035, .35, .025, 0x6a7e86, x, .4, side * 1.01, .01); spoke.rotation.z = i * Math.PI / 5;
        }
      }
      rounded(g, .09, .18, .4, 0xffedb9, 1.95, .78, side * .53, .07);
      rounded(g, .08, .16, .4, 0xaa3e39, -1.96, .78, side * .53, .06);
    }
    rounded(g, .09, .22, .84, 0x273a43, 1.98, .51, 0, .07);
    rounded(g, .03, .12, .45, 0xf2eee0, -2.02, .6, 0, .02);
    rounded(g, 1.2, .08, 1.4, color, 1.25, .98, 0, .04, .26);
    // Keep paint available to the batcher as a shared polished surface.
    const body = g.children[0] as THREE.Mesh; body.material = paint;
    return g;
  }
  function bench(parent: THREE.Object3D, x: number, z: number, angle = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = angle; parent.add(g);
    for (let i = 0; i < 4; i++) rounded(g, 2.3, .1, .13, 0xb38357, 0, .64, -.23 + i * .16, .03);
    for (let i = 0; i < 3; i++) rounded(g, 2.3, .12, .1, 0xa6754d, 0, .9 + i * .17, -.38, .03);
    for (const side of [-1, 1]) { rounded(g, .1, .6, .6, 0x3d5656, side * .85, .3, 0, .04); rounded(g, .1, .1, .75, 0x3d5656, side * 1.05, .9, 0, .04); }
  }
  function tree(parent: THREE.Object3D, x: number, z: number, size = 1) {
    const g = new THREE.Group(); g.position.set(x, .15, z); g.scale.setScalar(size); parent.add(g);
    tube(g, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(.12, 1.7, -.1), new THREE.Vector3(-.1, 3.4, 0)], .18, 0x7e624b);
    for (let i = 0; i < 6; i++) { const a = i * 2.4; const x = Math.cos(a) * 1.05, z = Math.sin(a) * 1.05; tube(g, [new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(x * .6, 2.7, z * .6), new THREE.Vector3(x, 3.2, z)], .08, 0x7e624b); ball(g, [0x547d49, 0x648d50, 0x7a9d5b][i % 3]!, x, 3.2 + (i % 2) * .55, z, 1.15, 1.3, 1.1); }
    ball(g, 0x6c9253, 0, 4.2, 0, 1.3, 1.2, 1.25);
  }
  function park(parent: THREE.Object3D, x: number, z: number, variant = 0) {
    const g = new THREE.Group(); g.position.set(x, .16, z); parent.add(g);
    rounded(g, 23, .22, 23, 0x759b64, 0, .04, 0, 1.6);
    // Curved promenade, central pond and planted islands replace empty squares.
    const path = new THREE.Mesh(new THREE.TorusGeometry(6.6, .8, 4, 64), mat(0xd9c9aa)); path.rotation.x = -Math.PI / 2; path.scale.z = .06; path.position.y = .12; g.add(path);
    rounded(g, 2.2, .12, 22, 0xd9c9aa, 0, .13, 0, .35);
    const pond = mesh(g, new THREE.CylinderGeometry(3.15, 3.3, .2, 48), mat(0x64aaa5, .22, .12), 0, .23, 0);
    pond.scale.z = .75;
    const rim = ring(g, 3.3, .18, 0xdad6c1, 0, .25, 0); rim.rotation.x = Math.PI / 2; rim.scale.y = .75;
    for (let i = 0; i < 5; i++) { const a = i * 1.24; const stone = ball(g, 0x9a9b83, Math.cos(a) * 2.9, .5, Math.sin(a) * 2.1, .45, .3, .35); stone.rotation.y = a; }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      tree(g, sx * 8.2, sz * 8.2, .95 + (variant % 2) * .1);
      const bed = rounded(g, 3.5, .4, 1.7, 0xc6b69b, sx * 7, .25, sz * 3, .4);
      bed.rotation.y = sx * .4;
      for (let f = 0; f < 7; f++) { const fx = sx * 7 - 1.2 + f * .4; ball(g, 0x5c8449, fx, .7, sz * 3, .3); ball(g, f % 2 ? 0xe2b153 : 0xc4868a, fx, 1, sz * 3, .15); }
      bench(g, sx * 5.1, sz * 4, -sx * .8);
    }
    // Pergola, picnic tables and a small playground make the park a place.
    for (const px of [-3, 3]) for (const pz of [-10, -7.5]) rounded(g, .17, 2.7, .17, 0xaa8256, px, 1.35, pz, .04);
    for (let i = 0; i < 9; i++) rounded(g, 6.7, .16, .13, 0xbd9563, 0, 2.8, -10 + i * .33, .04);
    rounded(g, 3, .12, 1.2, 0x997145, 0, 1, -8.7, .08);
    for (const side of [-1, 1]) rounded(g, 3, .15, .4, 0xaa8256, 0, .6, -8.7 + side * 1, .08);
    for (const px of [-2, 2]) rounded(g, .14, 2.4, .14, 0xe0ac62, px, 1.2, 8.8, .04);
    rounded(g, 4.5, .15, .15, 0xe0ac62, 0, 2.4, 8.8, .04);
    for (const px of [-.7, .7]) { tube(g, [new THREE.Vector3(px, 2.4, 8.8), new THREE.Vector3(px, .8, 8.8)], .025, 0x52616a); }
    rounded(g, 1.65, .15, .55, 0x698e9e, 0, .75, 8.8, .1);
    return g;
  }
  function breadSign(parent: THREE.Object3D, x: number, y: number, z: number) {
    const loaf = ball(parent, 0xd99a4e, x, y, z, 2.3, .85, .7); loaf.rotation.z = .12;
    for (let i = 0; i < 4; i++) { const cut = rounded(parent, .15, .65, .05, 0xf6d69b, x - 1.2 + i * .75, y + .2, z + .64, .05); cut.rotation.z = -.35; }
  }
  return { rounded, ball, tube, ring, mat, car, bench, tree, park, breadSign };
}

type Routine = 'walk' | 'shopping' | 'coffee' | 'shore' | 'sunbathe' | 'volley' | 'swim';
export interface CityWalker { route: THREE.Vector3[]; segment: number; distance: number; speed: number; phase: number; routine: Routine; wait: number; hasBag: boolean; slot: number }
export function createWalkers(scene: THREE.Scene) {
  const routes: THREE.Vector3[][] = [];
  for (const x of [-60, -20, 20, 60]) for (const z of [-20, 20, 60]) routes.push([[-15.8, -15.8], [15.8, -15.8], [15.8, 15.8], [-15.8, 15.8]].map(([dx, dz]) => new THREE.Vector3(x + dx!, .2, z + dz!)));
  routes.push([new THREE.Vector3(95.4, .2, -70), new THREE.Vector3(95.4, .2, 75), new THREE.Vector3(96.3, .2, 75), new THREE.Vector3(96.3, .2, -70)]);
  for (const x of [-180, -140, -100, -60, -20, 20, 60]) for (const z of [-140, -100, 100, 140]) routes.push([[-15.8, -15.8], [15.8, -15.8], [15.8, 15.8], [-15.8, 15.8]].map(([dx, dz]) => new THREE.Vector3(x + dx!, .2, z + dz!)));
  const walkers: CityWalker[] = Array.from({ length: 64 }, (_, i) => ({ route: routes[i % routes.length]!, segment: i % 4, distance: (i % 5) * 4, speed: .65 + (i % 4) * .13, phase: i * 1.7, routine: 'walk', wait: 0, hasBag: false, slot: i }));
  const route = (points: [number, number][]) => points.map(([x, z]) => new THREE.Vector3(x, .2, z));
  const add = (routine: Routine, points: [number, number][], slot: number, segment = 0, wait = 0) => walkers.push({ route: route(points), segment, distance: 0, speed: .8 + slot % 3 * .13, phase: slot * 1.4, routine, wait, hasBag: false, slot });
  for (let i = 0; i < 10; i++) {
    const market = i % 3 !== 0;
    const x = market ? 18 : 60, z = market ? 65.3 : 64.1;
    add('shopping', [[x - 12, 75.8], [x, 75.8], [x, z + 3], [x, z], [x, z + 3], [x, 75.8], [x + 12, 75.8]], i, i % 7, i % 7 === 3 ? 5 : 0);
  }
  for (let i = 0; i < 6; i++) {
    const x = 52 + Math.floor(i / 2) * 4 + (i % 2 ? 1.2 : -1.2);
    add('coffee', [[56, 35.8], [x, 35.8], [x, 29], [x, 24], [x, 29], [x, 35.8]], i, i % 2 ? 0 : 3, i % 2 ? 0 : 12);
  }
  for (let i = 0; i < 12; i++) { const z = i % 2 ? 9 : -80; add('shore', [[110.2, z], [110.2, z + 65], [109.8, z + 65], [109.8, z]], i, i % 4); walkers[walkers.length - 1]!.distance = i % 6 * 7; }
  BEACH_TOWELS.forEach((t, i) => add('sunbathe', [[t.x, t.z], [t.x, t.z + .01]], i));
  VOLLEY_COURTS.forEach((court, c) => { for (let i = 0; i < 4; i++) add('volley', [[court.x + (i % 2 ? 2 : -2), court.z + (i < 2 ? -4.8 : 4.8)], [court.x, court.z]], c * 4 + i); });
  for (let i = 0; i < 8; i++) add('swim', [[119 + i % 3 * 3, -20 + i * 12], [121 + i % 3 * 3, -15 + i * 12]], i);
  const count = walkers.length;
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 });
  const torso = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.23, .38, 4, 8), material, count);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.19, 10, 8), material, count);
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(.194, 10, 8, 0, Math.PI * 2, 0, Math.PI * .55), material, count);
  const limbs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.075, .46, 3, 6), material, count * 4);
  const shoes = new THREE.InstancedMesh(new RoundedBoxGeometry(.16, .12, .28, 1, .04), material, count * 2);
  const bags = new THREE.InstancedMesh(new RoundedBoxGeometry(.3, .38, .2, 1, .03), material, count);
  const cups = new THREE.InstancedMesh(new THREE.CylinderGeometry(.085, .065, .16, 8), material, count);
  torso.name = 'city-residents'; bags.name = 'shopping-bags';
  const meshes = [torso, heads, hair, limbs, shoes, bags, cups];
  const colors = [0xb77a5a, 0x658ba5, 0xc99e58, 0x61816c, 0xd2b7a4, 0x635e7a];
  for (let i = 0; i < count; i++) {
    const skin = new THREE.Color([0xe1b38b, 0xb47d55, 0x855b42][i % 3]!);
    torso.setColorAt(i, new THREE.Color(colors[i % colors.length]!)); heads.setColorAt(i, skin); hair.setColorAt(i, new THREE.Color(i % 3 ? 0x453c32 : 0x997651));
    bags.setColorAt(i, new THREE.Color(i % 2 ? 0xc4a575 : 0x78976c)); cups.setColorAt(i, new THREE.Color(0xf6ebd7));
    for (let j = 0; j < 4; j++) limbs.setColorAt(i * 4 + j, j < 2 ? new THREE.Color(0x43545c) : skin);
    for (let j = 0; j < 2; j++) shoes.setColorAt(i * 2 + j, new THREE.Color(i % 2 ? 0xd5d2c7 : 0x303b3e));
  }
  for (const mesh of meshes) { mesh.castShadow = false; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); }
  const root = new THREE.Object3D(), part = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3(), direction = new THREE.Vector3();
  function update(dt: number, seconds: number, reduced: boolean) {
    for (const [i, person] of walkers.entries()) {
      const fixed = ['sunbathe', 'volley', 'swim'].includes(person.routine);
      if (!reduced) {
        if (person.wait > 0) { person.wait = Math.max(0, person.wait - dt); if (person.routine === 'shopping') person.hasBag = true; }
        else if (!fixed) person.distance += dt * person.speed;
      }
      let guard = 0;
      while (!fixed && person.distance >= person.route[person.segment]!.distanceTo(person.route[(person.segment + 1) % person.route.length]!) && guard++ < 20) {
        person.distance -= person.route[person.segment]!.distanceTo(person.route[(person.segment + 1) % person.route.length]!);
        person.segment = (person.segment + 1) % person.route.length;
        if (person.segment === 3 && ['shopping', 'coffee'].includes(person.routine)) { person.wait = person.routine === 'coffee' ? 12 : 5; person.distance = 0; person.hasBag = person.routine === 'shopping'; break; }
      }
      const start = person.route[person.segment]!, end = person.route[(person.segment + 1) % person.route.length]!;
      direction.copy(end).sub(start); position.copy(start).addScaledVector(direction, fixed ? 0 : Math.min(1, person.distance / Math.max(.001, direction.length())));
      const sitting = person.routine === 'coffee' && person.wait > 0;
      const indoors = person.routine === 'shopping' && person.wait > 0;
      let stride = reduced || person.wait > 0 ? 0 : Math.sin(seconds * 6 + person.phase) * .42;
      root.position.copy(position); root.rotation.set(0, Math.atan2(direction.x, direction.z), 0); root.scale.setScalar(indoors ? .001 : 1);
      let armLift = 0;
      if (sitting) { root.position.y = -.03; root.rotation.y = person.slot % 2 ? -Math.PI / 2 : Math.PI / 2; }
      if (person.routine === 'sunbathe') { root.position.y = .27; root.rotation.set(Math.PI / 2, 0, 0); stride = 0; }
      if (person.routine === 'volley') {
        const t = seconds + Math.floor(person.slot / 4) * 1.3;
        const bounce = reduced ? 0 : Math.max(0, Math.sin(t * Math.PI / 1.2 + (person.slot % 4 < 2 ? 0 : Math.PI)));
        root.position.x += reduced ? 0 : Math.sin(t * 1.5 + person.slot) * .45; root.position.y += bounce * .2;
        root.rotation.y = person.slot % 4 < 2 ? 0 : Math.PI; armLift = -1.8 * bounce; stride *= .25;
      }
      if (person.routine === 'swim') { root.position.y = -.9; root.position.x += reduced ? 0 : Math.sin(seconds * .3 + person.slot) * .6; root.position.z += reduced ? 0 : Math.sin(seconds * .2 + person.slot) * .8; armLift = -1.4; stride = reduced ? 0 : Math.sin(seconds * 2 + person.slot) * .6; }
      root.updateMatrix();
      const place = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, angle = 0, scale = 1) => { part.position.set(x, y, z); part.rotation.set(angle, 0, 0); part.scale.setScalar(scale); part.updateMatrix(); mesh.setMatrixAt(index, matrix.multiplyMatrices(root.matrix, part.matrix)); };
      place(torso, i, 0, 1.02, 0); place(heads, i, 0, 1.65, 0); place(hair, i, 0, 1.67, 0);
      for (let side = 0; side < 2; side++) { const sign = side ? 1 : -1; place(limbs, i * 4 + side, sign * .13, .49, sitting ? .25 : stride * sign * .22, sitting ? -1 : stride * sign); place(limbs, i * 4 + side + 2, sign * .29, armLift ? 1.25 : 1, sitting ? .25 : -stride * sign * .18, sitting ? -.8 : armLift - stride * sign); place(shoes, i * 2 + side, sign * .13, .13, (sitting ? .6 : .06) + stride * sign * .33); }
      place(bags, i, .42, .6, .04, 0, person.hasBag ? 1 : .001);
      place(cups, i, .29, 1.1, .45, 0, sitting ? 1 : .001);
    }
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, 0, true);
  return { update, count, routines: walkers.reduce((result, w) => { result[w.routine] = (result[w.routine] ?? 0) + 1; return result; }, {} as Record<string, number>) };
}
