import * as THREE from 'three';
import { springfieldKit } from './springfieldKit';

/** Reusable cartoon cars and the school bus follow connected city blocks. */
export function createSpringfieldTraffic(parent: THREE.Group) {
  const kit = springfieldKit(false);
  const templates = ['#d99aab', '#9bb9ca', '#dda465', '#84aa95', '#d9be66'].map((paint, index) => {
    const g = new THREE.Group(), bus = index === 4, length = bus ? 8.8 : 5.3;
    kit.box(g, 2.7, bus ? 2.7 : 1.1, length, paint, 0, bus ? 2 : 1.05, 0, true);
    kit.box(g, 2.35, bus ? 1.05 : .95, bus ? 7.5 : 2.65, '#608794', 0, bus ? 2.65 : 1.9, bus ? .1 : -.3, true);
    kit.box(g, 2.6, .2, bus ? 7.8 : 2.85, paint, 0, bus ? 3.26 : 2.43, bus ? .1 : -.3, true);
    for (const x of [-1.28, 1.28]) for (const z of [-length * .32, length * .32]) {
      const wheel = kit.cylinder(g, .58, .58, .28, '#444c49', x, .64, z, 12); wheel.rotation.z = Math.PI / 2;
      const hub = kit.cylinder(g, .27, .27, .3, '#a8b3af', x, .64, z, 10); hub.rotation.z = Math.PI / 2;
    }
    for (const x of [-.86, .86]) { kit.box(g, .5, .3, .14, '#f4df9c', x, 1.25, length / 2 + .03, true); kit.box(g, .45, .24, .14, '#b96953', x, 1.2, -length / 2 - .03); }
    if (bus) for (let j = 0; j < 7; j++) for (const side of [-1, 1]) kit.box(g, .08, 1.12, .13, paint, side * 1.19, 2.65, -3 + j);
    else { kit.box(g, 2.5, .2, .25, '#b2bab6', 0, .85, length / 2); kit.box(g, 2.5, .2, .25, '#b2bab6', 0, .85, -length / 2); }
    const baked = new THREE.Group(); kit.bake([g], baked, false); const source = baked.children[0] as THREE.Mesh;
    const fleet = new THREE.InstancedMesh(source.geometry, source.material, bus ? 1 : 6); fleet.frustumCulled = false; fleet.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(fleet);
    return fleet;
  });
  const dummy = new THREE.Object3D();
  function update(seconds: number) {
    templates.forEach((fleet, kind) => {
      for (let i = 0; i < fleet.count; i++) {
        const west = -210 + ((i + kind) % 4) * 70 + 2.25, north = -210 + ((i * 2 + kind) % 4) * 70 + 2.25;
        const size = kind === 4 ? 280 : 70 + ((i + kind) % 2) * 70;
        const d = (seconds * (kind === 4 ? 6 : 7.5) + i * 55 + kind * 37) % (size * 4);
        let x: number, z: number, angle: number;
        if (d < size) { x = west + d; z = north; angle = Math.PI / 2; }
        else if (d < size * 2) { x = west + size; z = north + d - size; angle = 0; }
        else if (d < size * 3) { x = west + size - (d - size * 2); z = north + size; angle = -Math.PI / 2; }
        else { x = west; z = north + size - (d - size * 3); angle = Math.PI; }
        dummy.position.set(x, .2, z); dummy.rotation.y = angle; dummy.updateMatrix(); fleet.setMatrixAt(i, dummy.matrix);
      }
      fleet.instanceMatrix.needsUpdate = true;
    });
  }
  update(0); kit.release(); return { update, count: 25 };
}
