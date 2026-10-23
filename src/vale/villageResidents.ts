import * as THREE from 'three';
import { heightAt } from './nordicTerrain';

export type VillageVisit = { x: number; front: number; door: number; kind: string };
export function createVillageResidents(parent: THREE.Group, visits: VillageVisit[]) {
  const count = 18;
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85 });
  const torso = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.24, .43, 3, 8), material, count);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.22, 8, 6), material, count);
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(.227, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55), material, count);
  const limbs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.085, .43, 2, 6), material, count * 4);
  const shoes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), material, count * 2);
  const bags = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .37, .2), material, count);
  const meshes = [torso, heads, hair, limbs, shoes, bags];
  meshes.forEach(mesh => { mesh.name = 'village-residents'; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(mesh); });
  const palette = ['#be7761', '#72949b', '#bc9b58', '#58755d', '#967d9c', '#d0b394'];
  const routes = Array.from({ length: count }, (_, i) => {
    const visit = visits[i % visits.length]!;
    const points = [[13.5, 48], [13.5, visit.front], [visit.x, visit.front], [visit.x, visit.door]] as [number, number][];
    const distances = points.slice(1).map((p, j) => Math.hypot(p[0] - points[j]![0], p[1] - points[j]![1]));
    const length = distances.reduce((a, b) => a + b, 0);
    torso.setColorAt(i, new THREE.Color(palette[i % palette.length]));
    const skin = new THREE.Color(['#e5b994', '#be8868', '#8f634b'][i % 3]); heads.setColorAt(i, skin);
    hair.setColorAt(i, new THREE.Color(i % 3 ? '#514339' : '#b99762'));
    for (let j = 0; j < 4; j++) limbs.setColorAt(i * 4 + j, new THREE.Color(j < 2 ? '#485866' : palette[i % palette.length]));
    for (let j = 0; j < 2; j++) shoes.setColorAt(i * 2 + j, new THREE.Color('#ece2cf'));
    bags.setColorAt(i, new THREE.Color('#bf9a70'));
    return { visit, points, distances, length, speed: 1 + i % 3 * .13, phase: i * 17.3, shopping: visit.kind === 'mercado' || visit.kind === 'padaria' };
  });
  const root = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4();
  function update(seconds: number, reduced = false) {
    routes.forEach((route, i) => {
      const travel = route.length / route.speed, cycle = travel * 2 + 10;
      const time = ((reduced ? 0 : seconds) + route.phase) % cycle;
      const waiting = time > travel && time < travel + 10;
      const returning = time >= travel + 10;
      let remaining = (returning ? cycle - time : Math.min(time, travel)) * route.speed;
      let segment = 0;
      while (segment < route.distances.length - 1 && remaining > route.distances[segment]!) remaining -= route.distances[segment++]!;
      const start = route.points[segment]!, end = route.points[segment + 1]!;
      const fraction = Math.min(1, remaining / Math.max(.001, route.distances[segment]!));
      const x = THREE.MathUtils.lerp(start[0], end[0], fraction), z = THREE.MathUtils.lerp(start[1], end[1], fraction);
      root.position.set(x, heightAt(x, z), z); root.rotation.y = Math.atan2(end[0] - start[0], end[1] - start[1]) + (returning ? Math.PI : 0); root.scale.setScalar(1.12); root.updateMatrix();
      const stride = waiting || reduced ? 0 : Math.sin(seconds * 6.5 + i) * .45;
      const place = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, angle = 0, sx = 1, sy = sx, sz = sx) => {
        part.position.set(x, y, z); part.rotation.set(angle, 0, 0); part.scale.set(sx, sy, sz); part.updateMatrix(); matrix.multiplyMatrices(root.matrix, part.matrix); mesh.setMatrixAt(index, matrix);
      };
      place(torso, i, 0, 1.13, 0); place(heads, i, 0, 1.77, 0); place(hair, i, 0, 1.8, 0);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        place(limbs, i * 4 + side, sign * .13, .47, 0, stride * sign);
        place(limbs, i * 4 + 2 + side, sign * .35, 1.06, 0, -stride * sign);
        place(shoes, i * 2 + side, sign * .13, .12, Math.sin(stride * sign) * .3 + .06, 0, .12, .11, .22);
      }
      place(bags, i, .4, .67, 0, 0, returning && route.shopping ? 1 : .001);
    });
    meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
  update(0, true);
  return { count, update };
}
