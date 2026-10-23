import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Shared sculpted pieces, baked by material into spatial chunks at completion. */
export function springfieldKit(withSigns = true) {
  const cache = new Map<string, THREE.BufferGeometry>();
  const colors = new Map<string, THREE.MeshStandardMaterial>();
  const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82 });
  const glow = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .34, emissive: '#ffd386', emissiveIntensity: .12 });
  const material = (color: string) => { if (!colors.has(color)) colors.set(color, new THREE.MeshStandardMaterial({ color, roughness: .82 })); return colors.get(color)!; };
  const geo = (key: string, make: () => THREE.BufferGeometry) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key)!; };
  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
    const m = new THREE.Mesh(geometry, material(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
  }
  const box = (p: THREE.Object3D, w: number, h: number, d: number, c: string, x = 0, y = h / 2, z = 0, rounded = false) => mesh(p, geo(rounded ? 'rounded' : 'box', () => rounded ? new RoundedBoxGeometry(1, 1, 1, 1, .035) : new THREE.BoxGeometry()), c, x, y, z, w, h, d);
  const sphere = (p: THREE.Object3D, c: string, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => mesh(p, geo('sphere', () => new THREE.SphereGeometry(1, 12, 8)), c, x, y, z, sx, sy, sz);
  const cylinder = (p: THREE.Object3D, top: number, bottom: number, h: number, c: string, x: number, y: number, z: number, segments = 12) => mesh(p, geo(`c:${top}:${bottom}:${h}:${segments}`, () => new THREE.CylinderGeometry(top, bottom, h, segments)), c, x, y, z);
  const torus = (p: THREE.Object3D, r: number, tube: number, c: string, x: number, y: number, z: number) => mesh(p, geo(`t:${r}:${tube}`, () => new THREE.TorusGeometry(r, tube, 7, 24)), c, x, y, z);
  function hipRoof(p: THREE.Object3D, w: number, d: number, rise: number, c: string, x: number, y: number, z: number) {
    const key = `roof:${w}:${d}:${rise}`;
    return mesh(p, geo(key, () => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2, -w * .24, rise, 0, w * .24, rise, 0], 3));
      g.setIndex([0, 4, 1, 1, 4, 5, 3, 2, 4, 2, 5, 4, 0, 3, 4, 1, 5, 2]); g.computeVertexNormals(); return g;
    }), c, x, y, z);
  }
  function window(p: THREE.Object3D, x: number, y: number, z: number, w = 2.5, h = 2.5, frame = '#f6e1bc') {
    box(p, w + .4, h + .4, .24, frame, x, y, z);
    const pane = box(p, w, h, .14, '#7ea9b4', x, y, z + .17); pane.userData.window = true;
    box(p, .12, h, .18, frame, x, y, z + .3); box(p, w, .12, .18, frame, x, y, z + .3);
  }
  function tree(p: THREE.Object3D, x: number, z: number, size = 1, tint = '#63995e') {
    cylinder(p, .2 * size, .36 * size, 3 * size, '#967652', x, 1.5 * size, z, 8);
    for (const [dx, dy, dz, radius] of [[0, 4.2, 0, 2], [-1, 3.3, .5, 1.45], [1, 3.5, -.5, 1.5], [0, 3, -1, 1.3]]) sphere(p, tint, x + dx! * size, dy! * size, z + dz! * size, radius! * size, radius! * size * 1.08);
  }
  function bench(p: THREE.Object3D, x: number, z: number, angle = 0) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = angle; p.add(group);
    for (let j = 0; j < 4; j++) box(group, 3, .12, .2, '#b5885d', 0, .85, -.35 + j * .23);
    for (const side of [-1, 1]) box(group, .13, .85, .7, '#536357', side * 1.15, .4, 0);
    for (let j = 0; j < 3; j++) box(group, 3, .16, .13, '#b5885d', 0, 1.2 + j * .23, -.55);
  }
  function lamp(p: THREE.Object3D, x: number, z: number) {
    cylinder(p, .08, .14, 5, '#566568', x, 2.5, z, 8);
    const bulb = sphere(p, '#ffe5a2', x, 5.1, z, .35, .45); bulb.userData.window = true;
    cylinder(p, 0, .55, .45, '#566568', x, 5.6, z, 8);
  }

  const atlasWidth = 1024, atlasHeight = 2048, cellW = 256, cellH = 128;
  const canvas = !withSigns || typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = atlasWidth; canvas.height = atlasHeight; }
  const context = canvas?.getContext('2d');
  const atlas = canvas ? new THREE.CanvasTexture(canvas) : new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.needsUpdate = true;
  const signMaterial = new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide });
  let signs = 0;
  function sign(p: THREE.Object3D, text: string, x: number, y: number, z: number, w: number, h = 2, bg = '#fff3c8', ink = '#334537') {
    if (signs >= 64) throw new Error('Sign atlas capacity exceeded');
    const col = signs % 4, row = Math.floor(signs++ / 4);
    if (context) {
      context.fillStyle = bg; context.fillRect(col * cellW, row * cellH, cellW, cellH);
      let fontSize = 31; do { context.font = `900 ${fontSize--}px Arial`; } while (context.measureText(text).width > cellW - 14 && fontSize > 12);
      context.fillStyle = ink; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, col * cellW + cellW / 2, row * cellH + cellH / 2);
    }
    const g = new THREE.PlaneGeometry(w, h); const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 4, 1 - (row + 1 - uv.getY(i)) / 16);
    const m = new THREE.Mesh(g, signMaterial); m.position.set(x, y, z); p.add(m); return m;
  }
  function bake(roots: THREE.Object3D[], target: THREE.Object3D, chunked = true) {
    const bins = new Map<string, THREE.BufferGeometry[]>();
    for (const root of roots) {
      root.updateMatrixWorld(true);
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh) || object.userData.pick) return;
        const original = object.material as THREE.MeshStandardMaterial;
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone(); geometry.applyMatrix4(object.matrixWorld);
        const isSign = object.material === signMaterial;
        let key: string;
        if (isSign) key = 'sign';
        else {
          const color = original.color, count = geometry.getAttribute('position').count, data = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) data.set([color.r, color.g, color.b], i * 3);
          geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
          geometry.deleteAttribute('uv');
          // Chunking keeps the broad city frustum-cullable in close views.
          const world = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
          key = object.userData.window ? 'window' : chunked ? `${Math.floor(world.x / 100)}:${Math.floor(world.z / 100)}` : 'body';
        }
        geometry.clearGroups(); if (!bins.has(key)) bins.set(key, []); bins.get(key)!.push(geometry);
      });
    }
    for (const [key, geometries] of bins) {
      const geometry = mergeGeometries(geometries); if (!geometry) throw new Error(`Cannot bake ${key}`);
      const m = new THREE.Mesh(geometry, key === 'sign' ? signMaterial : key === 'window' ? glow : surface);
      m.name = `springfield-${key}`; m.castShadow = key !== 'sign' && key !== 'window'; m.receiveShadow = true; target.add(m); geometries.forEach(g => g.dispose());
    }
    atlas.needsUpdate = true;
  }
  function release() { for (const geometry of cache.values()) geometry.dispose(); for (const m of colors.values()) m.dispose(); if (!signs) { atlas.dispose(); signMaterial.dispose(); } }
  return { box, sphere, cylinder, torus, hipRoof, window, tree, bench, lamp, sign, bake, release, glow, mesh, geo };
}
export type SpringfieldKit = ReturnType<typeof springfieldKit>;
