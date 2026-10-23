import * as THREE from 'three';

const gaussian = (x: number, z: number, cx: number, cz: number, sx: number, sz: number) => Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
const smooth = (a: number, b: number, value: number) => { const t = Math.min(1, Math.max(0, (value - a) / (b - a))); return t * t * (3 - 2 * t); };

export const VILLAGE_LAYOUT = { shoreZ: 53, bankX: 64, eastBankX: 125, centerX: -8, centerZ: -10, halfWidth: 55, halfDepth: 58 };
export const NORDIC_VIEW = { azimuth: 1.48, polar: .98, radius: 174, target: [0, 7, -6] as const };
export const villagePosition = (x: number, z: number): [number, number] => [x * 1.35, z * 1.3];

/** Continuous, sculpted shores, mountains and the flat inhabited terrace. */
export function heightAt(x: number, z: number) {
  const shore = VILLAGE_LAYOUT.shoreZ + Math.sin(x * .035) * 7;
  const bank = VILLAGE_LAYOUT.bankX + Math.sin(z * .027) * 7;
  const edge = Math.min(shore - z, bank - x);
  const eastBank = VILLAGE_LAYOUT.eastBankX + Math.sin(z * .018) * 10;
  if (x > eastBank) {
    const inland = x - eastBank;
    return smooth(0, 12, inland) * (15 + 30 * gaussian(x, z, 163, -55, 48, 120)) + Math.sin(z * .05) * Math.sin(x * .07) * smooth(10, 30, inland) * 3 - .3;
  }
  if (edge < 0) return -1.5 - Math.min(15, -edge * .3);
  const terrace = smooth(0, 7, edge) * 1.8;
  const hills = 73 * gaussian(x, z, -112, -65, 45, 62) + 58 * gaussian(x, z, -160, 15, 54, 71) + 54 * gaussian(x, z, -35, -160, 65, 48);
  const villageMask = smooth(0, 28, Math.max(Math.abs(x - VILLAGE_LAYOUT.centerX) - VILLAGE_LAYOUT.halfWidth, Math.abs(z - VILLAGE_LAYOUT.centerZ) - VILLAGE_LAYOUT.halfDepth));
  const mountains = hills * villageMask * .9;
  const erosion = (Math.sin(x * .17 + Math.sin(z * .08)) * 1.2 + Math.sin(z * .11 + x * .04) * 1.3) * smooth(6, 25, mountains);
  return terrace + mountains + erosion;
}

export function createNordicTerrain() {
  const geometry = new THREE.PlaneGeometry(440, 440, 176, 176);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) positions.setY(i, heightAt(positions.getX(i), positions.getZ(i)));
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color('#71835c'), stone = new THREE.Color('#555f5d'), snow = new THREE.Color('#bac4ba'), sand = new THREE.Color('#9f9d83');
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const h = positions.getY(i), up = normals.getY(i);
    color.copy(grass).lerp(stone, Math.min(1, Math.max(0, (.85 - up) * 3.5)));
    if (h < 1) color.lerp(sand, .6);
    if (h > 62) color.lerp(snow, Math.min(.65, (h - 62) / 28));
    color.multiplyScalar(.96 + Math.sin(positions.getX(i) * .19 + positions.getZ(i) * .13) * .04);
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98 }));
  mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'fjord-terrain';
  return mesh;
}
