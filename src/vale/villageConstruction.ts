import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createConstructionSite(width: number, depth: number) {
  const parts: THREE.BufferGeometry[] = [];
  function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
    const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed(); geometry.translate(x, y, z);
    const c = new THREE.Color(color), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
    geometry.deleteAttribute('uv'); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); parts.push(geometry);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) box(width / 8 - .08, 1.4, .13, -width / 2 + (i + .5) * width / 8, .7, side * depth / 2, i % 2 ? '#bb9d74' : '#aa8b65');
    for (let i = 0; i < 6; i++) box(.13, 1.4, depth / 6 - .08, side * width / 2, .7, -depth / 2 + (i + .5) * depth / 6, i % 2 ? '#bb9d74' : '#aa8b65');
    for (const y of [.38, 1.15]) box(width, .11, .15, 0, y, side * (depth / 2 - .12), '#7d6c52');
  }
  for (let i = 0; i < 7; i++) box(3.4, .16, .35, -.8 + i % 2 * .12, .1 + Math.floor(i / 2) * .17, .4 + i % 2 * .4, '#a88258');
  for (const x of [-width * .3, width * .3]) box(.13, 3.1, .13, x, 1.55, -depth * .25, '#758784');
  box(width * .6, .13, .13, 0, 3, -depth * .25, '#758784');
  box(2.5, 1.1, .14, 0, 1.55, depth / 2 + .08, '#355d50');
  const geometry = mergeGeometries(parts)!; parts.forEach(part => part.dispose());
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group(); group.add(mesh); return group;
}
