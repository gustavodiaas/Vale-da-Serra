import * as THREE from 'three';
import type { CityCar } from './siliconValley';

/** Share each car model across vehicles, rather than drawing every part per car. */
export function createCarFleet(scene: THREE.Scene, cars: CityCar[]) {
  const groups = new Map<string, CityCar[]>();
  for (const car of cars) {
    const key = car.mesh.userData.model as string;
    const list = groups.get(key) ?? []; list.push(car); groups.set(key, list);
  }
  const batches: { mesh: THREE.InstancedMesh; cars: CityCar[]; local: THREE.Matrix4 }[] = [];
  const retained = new Set<THREE.BufferGeometry>();
  for (const list of groups.values()) {
    const template = list[0]!.mesh;
    template.updateMatrixWorld(true);
    for (const obj of template.children) {
      if (!(obj instanceof THREE.Mesh)) continue;
      const instances = new THREE.InstancedMesh(obj.geometry, obj.material, list.length);
      instances.castShadow = false; instances.receiveShadow = false;
      instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Small moving fleets have bounded city-wide bounds; avoid recomputing each frame.
      instances.frustumCulled = false;
      scene.add(instances); retained.add(obj.geometry);
      batches.push({ mesh: instances, cars: list, local: obj.matrix.clone() });
    }
  }
  const released = new Set<THREE.BufferGeometry>();
  for (const car of cars) {
    scene.remove(car.mesh);
    car.mesh.traverse(obj => { if (obj instanceof THREE.Mesh && !retained.has(obj.geometry)) released.add(obj.geometry); });
  }
  for (const geometry of released) geometry.dispose();
  const matrix = new THREE.Matrix4();
  function update() {
    for (const car of cars) car.mesh.updateMatrix();
    for (const batch of batches) {
      batch.cars.forEach((car, index) => batch.mesh.setMatrixAt(index, matrix.multiplyMatrices(car.mesh.matrix, batch.local)));
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  update();
  return { update };
}
