import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from './nordicTerrain';

type Lot = { x: number; z: number; width: number; depth: number };
type Shop = { x: number; front: number; width: number; kind: string };

/** Gardens define private yards; awnings and terraces distinguish local shops. */
export function createResidentialStreets(root: THREE.Group, lots: Lot[], shops: Shop[]) {
  const parts: THREE.BufferGeometry[] = [];
  function add(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rotateX = 0) {
    const part = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geometry.dispose();
    part.rotateX(rotateX); part.translate(x, y, z);
    for (const key of Object.keys(part.attributes)) if (!['position', 'normal'].includes(key)) part.deleteAttribute(key);
    if (!part.getAttribute('normal')) part.computeVertexNormals();
    const c = new THREE.Color(color), colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3)); parts.push(part);
  }
  for (const lot of lots) {
    const back = lot.z - lot.depth * .64, half = lot.width * .6;
    for (let i = 0; i < 6; i++) {
      const x = lot.x - half + i * half * .4, y = heightAt(x, back);
      add(new THREE.BoxGeometry(.16, .95, .16), '#eee8d6', x, y + .475, back);
      add(new THREE.SphereGeometry(.115, 8, 6), '#eee8d6', x, y + 1, back);
    }
    for (const h of [.36, .72]) add(new THREE.BoxGeometry(half * 2, .1, .1), '#dedbc8', lot.x, heightAt(lot.x, back) + h, back);
    // Rounded shrubs soften the fence line without covering the front doors.
    for (const side of [-1, 1]) {
      const x = lot.x + side * half, z = lot.z + lot.depth * .24;
      add(new THREE.SphereGeometry(.55, 10, 7), '#789369', x, heightAt(x, z) + .45, z);
    }
  }
  for (const shop of shops) {
    const width = shop.width * .5, y = heightAt(shop.x, shop.front);
    for (let stripe = 0; stripe < 10; stripe++) {
      const vertices: number[] = [], indices: number[] = [];
      for (let row = 0; row <= 6; row++) for (const side of [0, 1]) {
        const t = row / 6;
        vertices.push(-width / 2 + (stripe + side) * width / 10, 3.3 - t * .55 + Math.sin(t * Math.PI) * .12, t * 1.65);
        if (row < 6 && side === 0) { const a = row * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const cloth = new THREE.BufferGeometry(); cloth.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); cloth.setIndex(indices); cloth.computeVertexNormals();
      add(cloth, stripe % 2 ? '#f1e5ce' : shop.kind === 'mercado' ? '#6a8a75' : '#b57a62', shop.x, y, shop.front);
    }
    for (const side of [-1, 1]) add(new THREE.CylinderGeometry(.045, .06, 2.75, 8), '#667367', shop.x + side * width * .48, y + 1.375, shop.front + 1.6);
    add(new THREE.BoxGeometry(width * .7, .55, .12), '#3e6254', shop.x, y + 3.85, shop.front + .1);
    if (shop.kind === 'cafe') {
      for (const offset of [-2.2, 2.2]) {
        const x = shop.x + offset, z = shop.front + 4;
        add(new THREE.CylinderGeometry(.7, .7, .12, 18), '#b99a72', x, y + .92, z);
        add(new THREE.CylinderGeometry(.08, .14, .86, 8), '#5c695d', x, y + .43, z);
        for (const side of [-1, 1]) {
          add(new THREE.BoxGeometry(.65, .12, .6), '#a9835f', x + side * 1.1, y + .5, z);
          add(new THREE.BoxGeometry(.12, .52, .6), '#a9835f', x + side * 1.35, y + .78, z);
          for (const dz of [-.2, .2]) add(new THREE.CylinderGeometry(.035, .045, .46, 6), '#5c695d', x + side * 1.1, y + .23, z + dz);
        }
      }
    }
  }
  const x = -17, z = 5, y = heightAt(x, z);
  add(new THREE.CylinderGeometry(6.3, 6.3, .08, 48), '#c9bfa6', x, y + .045, z);
  add(new THREE.TorusGeometry(1.7, .2, 8, 32), '#bbbca6', x, y + .35, z, Math.PI / 2);
  add(new THREE.CylinderGeometry(1.58, 1.58, .12, 32), '#709c9a', x, y + .22, z);
  add(new THREE.CylinderGeometry(.15, .28, .6, 12), '#abb4a4', x, y + .45, z);
  add(new THREE.SphereGeometry(.25, 10, 7), '#c0c5b1', x, y + .83, z);
  const geometry = mergeGeometries(parts)!; parts.forEach(part => part.dispose());
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86, side: THREE.DoubleSide }));
  mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'residential-yards-and-shopfronts'; root.add(mesh);
}
