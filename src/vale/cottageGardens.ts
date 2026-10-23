import * as THREE from 'three';
import { heightAt } from './nordicTerrain';

/** Small shared props: flowers, timber beds and warm entry lanterns. */
export function createCottageGardens(parent: THREE.Group, entries: { x: number; front: number; width: number }[], glow: THREE.MeshStandardMaterial) {
  const beds = entries.length * 2;
  const wood = new THREE.MeshStandardMaterial({ color: '#987454', roughness: .95 });
  const green = new THREE.MeshStandardMaterial({ color: '#607c4d', roughness: .95 });
  const petal = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .75 });
  const metal = new THREE.MeshStandardMaterial({ color: '#46514a', roughness: .7 });
  const timber = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wood, beds * 4);
  const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), green, beds * 5);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), petal, beds * 5);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.055, .085, 2.4, 8), metal, entries.length);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(.18, 10, 7), glow, entries.length);
  const caps = new THREE.InstancedMesh(new THREE.ConeGeometry(.32, .22, 8), metal, entries.length);
  const transform = new THREE.Object3D();
  function place(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) {
    transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
  }
  entries.forEach((entry, i) => {
    for (let side = 0; side < 2; side++) {
      const bed = i * 2 + side, x = entry.x + (side ? 1 : -1) * entry.width * .34, z = entry.front;
      const y = heightAt(x, z);
      place(timber, bed * 4, x, y + .23, z - .39, 2.7, .46, .12);
      place(timber, bed * 4 + 1, x, y + .23, z + .39, 2.7, .46, .12);
      place(timber, bed * 4 + 2, x - 1.3, y + .23, z, .12, .46, .78);
      place(timber, bed * 4 + 3, x + 1.3, y + .23, z, .12, .46, .78);
      for (let j = 0; j < 5; j++) {
        const px = x - .95 + j * .47, pz = z + Math.sin(j * 2.4) * .13;
        place(leaves, bed * 5 + j, px, y + .5, pz, .3, .28, .26);
        place(flowers, bed * 5 + j, px, y + .78 + j % 2 * .09, pz, .15, .12, .15);
        flowers.setColorAt(bed * 5 + j, new THREE.Color(['#e5ab9d', '#e4c879', '#d5c0d5'][(i + j) % 3]));
      }
    }
    const x = entry.x + entry.width * .6, z = entry.front - .2, y = heightAt(x, z);
    place(poles, i, x, y + 1.2, z); place(lamps, i, x, y + 2.45, z); place(caps, i, x, y + 2.73, z);
  });
  for (const mesh of [timber, leaves, flowers, poles, lamps, caps]) {
    mesh.name = 'cottage-garden'; mesh.receiveShadow = true; parent.add(mesh);
  }
}
