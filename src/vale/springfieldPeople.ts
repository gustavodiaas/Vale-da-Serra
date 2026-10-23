import * as THREE from 'three';
import { springfieldKit } from './springfieldKit';
import { SPRINGFIELD_CHARACTERS, SPRINGFIELD_ROADS, getPlace } from './springfieldLocations';

export function streetRoute(from: [number, number], to: [number, number]) {
  const nearest = (value: number) => SPRINGFIELD_ROADS.reduce((best, road) => Math.abs(value - road) < Math.abs(value - best) ? road : best);
  const start: [number, number] = [from[0], nearest(from[1]) - 6.1], end: [number, number] = [to[0], nearest(to[1]) - 6.1];
  const road = nearest(from[0]) + 6.1;
  return [start, [road, start[1]], [road, end[1]], end] as [number, number][];
}
export function sampleWalk(route: [number, number][], seconds: number, speed: number, phase = 0) {
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i]![0], p[1] - route[i]![1]));
  const duration = lengths.reduce((a, b) => a + b, 0) / speed;
  const cycle = Math.max(1, duration * 2 + 12), time = (seconds + phase) % cycle;
  const waiting = time > duration && time < duration + 12, returning = time >= duration + 12;
  let distance = (returning ? cycle - time : Math.min(time, duration)) * speed, segment = 0;
  while (segment < lengths.length - 1 && distance > lengths[segment]!) distance -= lengths[segment++]!;
  const a = route[segment]!, b = route[segment + 1]!, t = Math.min(1, distance / Math.max(.001, lengths[segment]!));
  return { x: THREE.MathUtils.lerp(a[0], b[0], t), z: THREE.MathUtils.lerp(a[1], b[1], t), angle: Math.atan2(b[0] - a[0], b[1] - a[1]) + (returning ? Math.PI : 0), waiting, returning };
}

export function createSpringfieldPeople(parent: THREE.Group) {
  const kit = springfieldKit(false), { sphere, box, cylinder, torus } = kit;
  const styles = [
    ['homer', '#eee7d2', '#7195b5', 1], ['marge', '#a3bd6b', '#edcc80', 1], ['bart', '#de8a56', '#7196b5', .74], ['lisa', '#d98655', '#e4ba6d', .69], ['maggie', '#8cbfce', '#8cbfce', .47], ['apu', '#739d77', '#bc9c6c', .95], ['krusty-person', '#d9a2b5', '#89b4a2', 1], ['ned', '#7f9e76', '#9a856c', 1.02], ['wiggum', '#6a92ad', '#5c7991', 1.04], ['burns-person', '#6f9f9e', '#6a8380', .98], ['neighbor', '#c39c77', '#6b929f', .9], ['neighbor-blue', '#89aab4', '#9f936d', .92],
  ] as const;
  const bodies = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material }>();
  for (const [kind, shirt] of styles) {
    const group = new THREE.Group(); const skin = kind === 'apu' ? '#d3ac6f' : '#eac568';
    const large = kind === 'homer' || kind === 'wiggum';
    sphere(group, shirt, 0, 1.4, 0, large ? .65 : .43, .65, large ? .43 : .3);
    if (kind === 'bart') box(group, .85, .3, .66, '#7498b3', 0, .89, 0, true);
    if (kind === 'marge' || kind === 'lisa' || kind === 'maggie') cylinder(group, .34, .62, 1.05, shirt, 0, 1.05, 0, 12);
    sphere(group, kind === 'krusty-person' ? '#eee6d0' : skin, 0, 2.25, 0, .48, kind === 'bart' ? .62 : .56, .43);
    for (const side of [-1, 1]) {
      sphere(group, skin, side * .48, 2.2, 0, .12, .18, .1);
      sphere(group, '#f7f2dc', side * .19, 2.36, .37, .22, .24, .15);
      sphere(group, '#39463d', side * .19, 2.36, .51, .073);
    }
    sphere(group, skin, 0, 2.18, .48, .14, .12, kind === 'burns-person' ? .33 : .16);
    if (kind === 'homer') { sphere(group, '#cba577', 0, 2.01, .34, .37, .23, .27); box(group, .42, .028, .05, '#81664c', 0, 1.97, .59); for (const x of [-.14, .14]) { const hair = torus(group, .2, .018, '#716549', x, 2.74, -.12); hair.rotation.x = Math.PI / 2; } }
    else box(group, .32, .025, .035, '#9b7c4b', 0, 1.99, .43);
    if (kind === 'marge') {
      for (let i = 0; i < 7; i++) sphere(group, '#6d91b8', Math.sin(i * 2) * .06, 2.75 + i * .18, -.05, .46 - i * .018, .3, .38);
      for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; sphere(group, '#c87759', Math.cos(a) * .3, 1.85, Math.sin(a) * .25, .09); }
    } else if (kind === 'bart' || kind === 'lisa' || kind === 'maggie') {
      for (let i = 0; i < (kind === 'bart' ? 8 : 10); i++) {
        const a = kind === 'bart' ? -.95 + i * .27 : i * Math.PI * 2 / 10;
        const spike = cylinder(group, 0, .14, .37, skin, Math.sin(a) * .46, 2.3 + Math.cos(a) * .52, -.05, 5); spike.rotation.z = -a;
      }
      if (kind === 'lisa') for (let i = 0; i < 7; i++) sphere(group, '#f4e9c9', -.27 + i * .09, 1.86, .26, .06);
      if (kind === 'maggie') { sphere(group, '#c88565', 0, 2.04, .56, .12); for (const s of [-1, 1]) sphere(group, '#85bdce', s * .16, 2.79, .1, .16, .1, .09); }
    } else if (kind === 'ned') {
      for (const x of [-.19, .19]) { torus(group, .22, .02, '#7c704b', x, 2.36, .53); sphere(group, '#977657', x * .7, 2.06, .46, .18, .09, .09); }
      sphere(group, '#997657', 0, 2.7, -.07, .47, .18, .39); box(group, .3, .18, .2, '#dbbbb0', 0, 1.88, .28);
    } else if (kind === 'krusty-person') {
      for (const x of [-.5, .5]) sphere(group, '#85b2a2', x, 2.52, -.03, .29, .34, .28);
      sphere(group, '#ba6253', 0, 2.19, .6, .14); for (const x of [-.11, .11]) sphere(group, '#88aaac', x, 1.9, .31, .14, .08, .07);
    } else if (kind === 'wiggum') {
      sphere(group, '#60859e', 0, 2.72, -.04, .52, .23, .44); box(group, .7, .06, .42, '#4b6a7d', 0, 2.65, .3, true); sphere(group, '#e4c076', -.22, 1.58, .43, .1);
    } else if (kind === 'apu') { sphere(group, '#575943', 0, 2.7, -.05, .49, .22, .43); box(group, .29, .55, .1, '#dfb56a', 0, 1.45, .29); }
    else if (kind === 'burns-person') { for (const s of [-1, 1]) sphere(group, '#b4c0ad', s * .39, 2.37, -.15, .15, .28, .26); }
    else sphere(group, '#7f7356', 0, 2.68, -.05, .48, .18, .4);
    if (kind === 'bart') { box(group, 1.3, .13, 1.5, '#8eac6b', 0, -.01, .05, true); for (const x of [-.5, .5]) for (const z of [-.48, .48]) sphere(group, '#8c7564', x, -.11, z, .13); }
    const baked = new THREE.Group(); kit.bake([group], baked, false);
    const mesh = baked.children[0] as THREE.Mesh;
    bodies.set(kind, { geometry: mesh.geometry, material: mesh.material as THREE.Material });
  }
  const limbMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85 });
  const count = styles.length + 20;
  const limbs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.105, .47, 2, 6), limbMat, count * 4);
  const feet = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), limbMat, count * 2);
  const bags = new THREE.InstancedMesh(new THREE.BoxGeometry(.35, .4, .22), limbMat, count);
  for (const m of [limbs, feet, bags]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(m); }
  const specs = [...styles.map((style, i) => ({ style, hero: SPRINGFIELD_CHARACTERS[i] })), ...Array.from({ length: 20 }, (_, i) => ({ style: styles[10 + i % 2]!, hero: undefined }))];
  const home = getPlace('simpsons')!;
  const actors = specs.map(({ style, hero }, i) => {
    const [kind, shirt, pants, scale] = style, source = bodies.get(kind)!;
    const body = new THREE.Mesh(source.geometry, source.material); body.name = hero?.name ?? `Morador ${i}`; parent.add(body);
    const target = hero ?? { x: [-175, -105, -35, 35, 105, 175][i % 6]!, z: [-105, -35, 35, 105][i % 4]!, depth: 24 };
    const fixed = ['apu', 'krusty-person', 'maggie', 'burns-person'].includes(kind);
    const route = streetRoute([i < 10 ? home.x : -175 + i % 6 * 70, i < 10 ? 140 : 70], [target.x, target.z + target.depth / 2]);
    for (let j = 0; j < 4; j++) limbs.setColorAt(i * 4 + j, new THREE.Color(j < 2 ? pants : kind === 'apu' ? '#d3ac6f' : '#eac568'));
    for (let j = 0; j < 2; j++) feet.setColorAt(i * 2 + j, new THREE.Color(kind === 'bart' ? '#79a5bf' : kind === 'lisa' ? '#c47559' : '#6e6d59'));
    bags.setColorAt(i, new THREE.Color('#b69a6c'));
    return { kind, body, hero, route, scale, fixed, shirt, x: 0, z: 0, target };
  });
  const root = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4();
  function update(seconds: number) {
    actors.forEach((actor, i) => {
      const pose = sampleWalk(actor.route, seconds, actor.kind === 'bart' ? 4 : 1.5 + i % 3 * .25, i * 22);
      const x = actor.fixed ? actor.kind === 'maggie' ? home.x - 8 : actor.target.x - 3 : pose.x;
      const z = actor.fixed ? actor.kind === 'maggie' ? home.z + 9 : actor.target.z + actor.target.depth * .5 + 3 : pose.z;
      actor.x = x; actor.z = z;
      const stride = actor.fixed || pose.waiting || actor.kind === 'bart' ? 0 : Math.sin(seconds * 6.5 + i) * .45;
      root.position.set(x, .23 + Math.abs(stride) * .05, z); root.rotation.y = actor.fixed ? .1 : pose.angle; root.scale.setScalar(actor.scale * 1.22); root.updateMatrix();
      actor.body.matrixAutoUpdate = false; actor.body.matrix.copy(root.matrix); actor.body.matrixWorldNeedsUpdate = true;
      const place = (mesh: THREE.InstancedMesh, index: number, px: number, py: number, pz: number, angle = 0, sx = 1, sy = sx, sz = sx) => { part.position.set(px, py, pz); part.rotation.set(angle, 0, 0); part.scale.set(sx, sy, sz); part.updateMatrix(); matrix.multiplyMatrices(root.matrix, part.matrix); mesh.setMatrixAt(index, matrix); };
      for (let side = 0; side < 2; side++) { const s = side ? 1 : -1; place(limbs, i * 4 + side, s * .2, .48, 0, stride * s); place(limbs, i * 4 + 2 + side, s * .51, 1.4, 0, -stride * s); place(feet, i * 2 + side, s * .2, .13, .12 + Math.sin(stride * s) * .2, 0, .15, .13, .26); }
      place(bags, i, .6, .82, 0, 0, actor.kind === 'marge' && pose.returning ? 1 : .001);
    });
    for (const mesh of [limbs, feet, bags]) mesh.instanceMatrix.needsUpdate = true;
  }
  update(0); kit.release();
  return { actors, count, update };
}
