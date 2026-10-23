import * as THREE from 'three';
import type { cityKit } from './cityLife';

/** Dense, continuous blocks around the playable district. No isolated city tile. */
export function buildDistrict(parent: THREE.Group, kit: ReturnType<typeof cityKit>) {
  const windows: THREE.MeshStandardMaterial[] = [];
  const chunks: THREE.Group[] = [];
  const tiles = new Map<string, THREE.Group>();
  let activeParent = parent;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const block = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(box, kit.mat(color)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > .3; m.receiveShadow = true; activeParent.add(m); return m;
  };
  const palettes = ['#cebda5', '#b2c4c6', '#c8c5ba', '#ad8f79', '#9eacb4', '#d4c7b1'];
  const facades = palettes.map((color, index) => {
    const tile = (emissive: boolean) => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = emissive ? '#000000' : color; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = emissive ? '#ffc887' : index % 2 ? '#547984' : '#416371'; ctx.fillRect(22, 16, 84, 91);
        if (!emissive) { ctx.fillStyle = '#ffffff25'; ctx.fillRect(25, 19, 77, 10); ctx.fillStyle = color; ctx.fillRect(62, 16, 4, 91); ctx.fillRect(22, 63, 84, 3); ctx.fillStyle = '#685e4f30'; ctx.fillRect(14, 110, 101, 7); }
      }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4; return tex;
    };
    const mat = new THREE.MeshStandardMaterial({ map: tile(false), roughness: .55, emissiveMap: tile(true), emissive: 0xffd3a0, emissiveIntensity: 0 }); windows.push(mat); return mat;
  });
  const pane = (w: number, h: number, x: number, y: number, z: number, angle: number, material: THREE.Material) => {
    const geometry = new THREE.PlaneGeometry(w, h);
    const uv = geometry.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(w / 2)), uv.getY(i) * Math.max(1, Math.round(h / 3)));
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.y = angle; mesh.receiveShadow = true; activeParent.add(mesh);
  };
  let buildingCount = 0;
  const styles = { spanish: 0, midcentury: 0, courtyard: 0, artdeco: 0, glass: 0 };
  type Style = keyof typeof styles;
  function shell(x: number, z: number, w: number, d: number, h: number, palette: number) {
    const color = Number.parseInt(palettes[palette % palettes.length]!.slice(1), 16);
    block(w, h, d, color, x, h / 2 + .25, z);
    const facade = facades[palette % palettes.length]!;
    pane(w - .18, h - .2, x, h / 2 + .3, z + d / 2 + .02, 0, facade);
    pane(w - .18, h - .2, x, h / 2 + .3, z - d / 2 - .02, Math.PI, facade);
    pane(d - .18, h - .2, x + w / 2 + .02, h / 2 + .3, z, Math.PI / 2, facade);
    pane(d - .18, h - .2, x - w / 2 - .02, h / 2 + .3, z, -Math.PI / 2, facade);
  }
  function roof(x: number, z: number, w: number, d: number, y: number) {
    for (const side of [-1, 1]) {
      const slope = block(w / 2 + .6, .2, d + 1, 0xac6c50, x + side * w / 4, y + .8, z);
      slope.rotation.z = -side * Math.atan2(1.6, w / 2);
    }
    block(.25, .2, d + 1.1, 0xc08562, x, y + 1.65, z);
  }
  function building(x: number, z: number, w: number, d: number, floors: number, variant: number, forced?: Style) {
    const type: Style = forced ?? (['spanish', 'midcentury', 'courtyard', 'artdeco', 'glass'] as const)[variant % 5]!;
    styles[type]++;
    const h = type === 'spanish' ? 6 : type === 'midcentury' ? 4.5 : type === 'courtyard' ? 9 : type === 'artdeco' ? Math.min(floors, 8) * 3 : Math.min(floors + 2, 12) * 3;
    block(w + .5, .25, d + .5, 0xd2cbbd, x, .15, z);
    if (type === 'spanish') {
      shell(x, z, w, d, h, 5); roof(x, z, w, d, h + .3);
      // Actual rounded arches give stucco arcades a distinct silhouette.
      for (let dx = -w / 2 + 1.5; dx < w / 2 - .5; dx += 2.7) {
        const arch = new THREE.Shape(); arch.moveTo(-.9, 0); arch.lineTo(-.9, 1.7); arch.absarc(0, 1.7, .9, Math.PI, 0, true); arch.lineTo(.9, 0); arch.closePath();
        const opening = new THREE.Mesh(new THREE.ShapeGeometry(arch, 8), kit.mat(0x456f72)); opening.position.set(x + dx, .4, z + d / 2 + .06); activeParent.add(opening);
        block(.22, 3, .8, 0xe6d7b9, x + dx - 1.25, 1.7, z + d / 2 + .25);
      }
      block(w + 1, .25, 1.7, 0xd6b98b, x, 3.3, z + d / 2 + .25);
    } else if (type === 'midcentury') {
      shell(x, z, w, d, h, variant % 2 ? 3 : 0);
      block(w + 1.8, .25, d + 2.2, 0xf2dfb8, x, h + .45, z);
      block(w * .8, 2.5, .12, 0x547e84, x, 1.7, z + d / 2 + .1);
      for (const side of [-1, 1]) block(.25, 3, .25, 0xba8b61, x + side * (w / 2 - .6), 1.7, z + d / 2 + 1.1);
      const fin = block(.7, h + 1.8, 1.5, variant % 2 ? 0x9cbaa9 : 0xce9b82, x + w / 3, (h + 1.8) / 2, z + d / 2); fin.rotation.y = .2;
    } else if (type === 'courtyard') {
      const wing = w * .25;
      shell(x - (w - wing) / 2, z, wing, d, h, 0);
      shell(x + (w - wing) / 2, z, wing, d, h, 5);
      shell(x, z - d * .35, w - wing * 2, d * .3, h, 0);
      block(w * .4, .1, d * .55, 0x6ab8b8, x, .35, z + d * .13);
      for (const side of [-1, 1]) for (const y of [3.3, 6.3]) {
        block(wing + 1, .16, d * .8, 0xe1cba7, x + side * (w - wing) / 2, y, z);
        block(.08, .7, d * .8, 0x709795, x + side * (w / 2 + .45), y + .4, z);
      }
      roof(x, z - d * .35, w, d * .3, h + .25);
    } else if (type === 'artdeco') {
      shell(x, z, w, d, h, 2);

      // Setback crown sits on the tower rather than repeating every floor slab.
      block(w * .7, 4, d * .7, 0xd7c6a1, x, h + 2, z);
      block(w * .43, 3, d * .43, 0xc4b17e, x, h + 5.5, z);
      for (const dx of [-w / 3, 0, w / 3]) block(.3, h + 1, .45, 0xd8bc80, x + dx, h / 2 + .5, z + d / 2 + .1);
    } else {
      shell(x, z, w * .82, d * .82, h, 1);
      block(w + .6, 3, d + .6, 0xd3d9d3, x, 1.75, z);
      block(w * .9, .3, d * .9, 0x617e89, x, h + .5, z);
      for (const side of [-1, 1]) block(.15, h, .15, 0x9bbec3, x + side * w * .4, h / 2 + .3, z + d * .42);
    }
    buildingCount++;
  }
  // Streets continue far beyond every allowed camera position and zoom level.
  const road = (axis: 'x' | 'z', fixed: number, start: number, end: number) => {
    const horizontal = axis === 'x', middle = (start + end) / 2, length = end - start;
    block(horizontal ? length : 9, .12, horizontal ? 9 : length, 0xcac9bd, horizontal ? middle : fixed, .02, horizontal ? fixed : middle);
    block(horizontal ? length : 6.8, .035, horizontal ? 6.8 : length, 0x535e60, horizontal ? middle : fixed, .125, horizontal ? fixed : middle);
    for (let p = start + 3; p < end - 2; p += 6) {
      if (Math.abs(p / 40 - Math.round(p / 40)) < .16) continue;
      block(horizontal ? 2.7 : .09, .012, horizontal ? .09 : 2.7, 0xd2be83, horizontal ? p : fixed, .15, horizontal ? fixed : p);
    }
  };
  for (let z = -320; z <= 320; z += 40) { if (Math.abs(z) > 80) road('x', z, -340, 94); else road('x', z, -340, -90); }
  for (let x = -320; x <= 80; x += 40) { if (x < -80) road('z', x, -340, 340); else { road('z', x, -340, -90); road('z', x, 90, 340); } }
  road('z', 90, -340, 340);
  for (let x = -300; x <= 60; x += 40) for (let z = -300; z <= 300; z += 40) {
    if (x >= -60 && Math.abs(z) <= 60) continue;
    const key = `${Math.floor(x / 160)}:${Math.floor(z / 160)}`;
    let tile = tiles.get(key);
    if (!tile) { tile = new THREE.Group(); tile.name = `district:${key}`; tiles.set(key, tile); chunks.push(tile); parent.parent!.add(tile); }
    activeParent = tile;
    const variant = Math.abs(Math.round(x * 7 + z * 3)) % 17;
    block(31, .08, 31, 0xc7c1b2, x, .04, z);
    building(x, z - 7, 27, 14, 3 + variant % 7, variant);
    for (const side of [-1, 1]) {
      building(x + side * 7.5, z + 8, 12, 11, 2 + (variant + side + 1) % 4, variant + side + 3, side < 0 ? 'spanish' : 'midcentury');
    }
  }
  activeParent = parent;
  const infill: [number, number, number, number, number][] = [
    [-30, 50, 6, 14, 4], [-30, 69, 6, 10, 3], [8, 73, 8, 5, 3], [29, 73, 8, 5, 4],
    [69, 12, 8, 15, 5], [48, 30, 6, 8, 3], [48, 58, 6, 19, 4], [72, 59, 6, 15, 3],
    [-26, -33, 10, 5, 3], [-12, -33, 9, 5, 4], [8, -31, 6, 7, 4], [28, -31, 10, 7, 5],
    [-70, 29, 7, 10, 3], [-49, 25, 6, 10, 5], [-70, -29, 7, 8, 3], [-49, -29, 6, 8, 4],
  ];
  infill.forEach(([x, z, w, d, floors], i) => building(x, z, w, d, floors, i));
  return { windows, get buildingCount() { return buildingCount; }, chunks, styles, landmark: building };
}
