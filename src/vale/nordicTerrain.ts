import * as THREE from 'three';

const gaussian = (x: number, z: number, cx: number, cz: number, sx: number, sz: number) => Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
const smooth = (a: number, b: number, value: number) => { const t = Math.min(1, Math.max(0, (value - a) / (b - a))); return t * t * (3 - 2 * t); };

export const VILLAGE_LAYOUT = { shoreZ: 53, bankX: 64, eastBankX: 125, centerX: -8, centerZ: -10, halfWidth: 55, halfDepth: 58 };
export const NORDIC_VIEW = { azimuth: 1.48, polar: .98, radius: 174, target: [0, 7, -6] as const };
export const villagePosition = (x: number, z: number): [number, number] => [x * 1.35, z * 1.3];
export const shoreAt = (x: number) => VILLAGE_LAYOUT.shoreZ + Math.sin(x * .035) * 7 + Math.sin(x * .071) * 1.3;
export const bankAt = (z: number) => VILLAGE_LAYOUT.bankX + Math.sin(z * .027) * 7 + Math.sin(z * .059) * 2;

/** Continuous, sculpted shores, mountains and the flat inhabited terrace. */
export function heightAt(x: number, z: number) {
  const a = shoreAt(x) - z, b = bankAt(z) - x;
  const corner = Math.max(12 - Math.abs(a - b), 0) / 12;
  const edge = Math.min(a, b) - corner * corner * 3;
  const eastBank = VILLAGE_LAYOUT.eastBankX + Math.sin(z * .018) * 10;
  if (x > eastBank - 14) {
    const inland = x - eastBank;
    return -8 + smooth(-12, 50, inland) * (14 + 23 * gaussian(x, z, 170, -55, 65, 120)) + Math.sin(z * .045) * Math.sin(x * .055) * smooth(15, 65, inland) * 1.8;
  }
  const terrace = 1.8 * smooth(-2, 7, edge) - 8 * (1 - smooth(-15, -2, edge));
  const hills = 49 * gaussian(x, z, -126, -65, 75, 90) + 35 * gaussian(x, z, -168, 24, 64, 74) + 36 * gaussian(x, z, -45, -169, 78, 60);
  const villageMask = smooth(0, 65, Math.max(Math.abs(x - VILLAGE_LAYOUT.centerX) - VILLAGE_LAYOUT.halfWidth, Math.abs(z - VILLAGE_LAYOUT.centerZ) - VILLAGE_LAYOUT.halfDepth));
  const mountains = hills * villageMask * .9;
  const erosion = (Math.sin(x * .09 + Math.sin(z * .04)) * 1.1 + Math.sin(z * .075 + x * .03) * .9) * smooth(6, 25, mountains);
  return terrace + (mountains + erosion) * smooth(0, 18, edge);
}

export function createNordicTerrain() {
  const geometry = new THREE.PlaneGeometry(440, 440, 192, 192);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) positions.setY(i, heightAt(positions.getX(i), positions.getZ(i)));
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color('#89a872'), stone = new THREE.Color('#838b7a'), snow = new THREE.Color('#c4cfbd'), sand = new THREE.Color('#c1b593');
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const h = positions.getY(i), up = normals.getY(i);
    color.copy(grass).lerp(stone, Math.min(.8, Math.max(0, (.84 - up) * 2.5)));
    if (h < 1) color.lerp(sand, .6);
    if (h > 62) color.lerp(snow, Math.min(.65, (h - 62) / 28));
    color.multiplyScalar(.96 + Math.sin(positions.getX(i) * .073 + positions.getZ(i) * .051) * .035 + Math.sin(positions.getZ(i) * .13) * .015);
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98 }));
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'fjord-terrain';
  return mesh;
}
