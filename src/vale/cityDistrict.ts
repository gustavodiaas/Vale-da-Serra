import * as THREE from 'three';
import type { cityKit } from './cityLife';

/** Dense, continuous blocks around the playable district. No isolated city tile. */
export function buildDistrict(parent: THREE.Group, kit: ReturnType<typeof cityKit>) {
  const windows: THREE.MeshStandardMaterial[] = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const block = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(box, kit.mat(color)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = h > .3; m.receiveShadow = true; parent.add(m); return m;
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
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.y = angle; mesh.receiveShadow = true; parent.add(mesh);
  };
  let buildingCount = 0;
  function building(x: number, z: number, w: number, d: number, floors: number, variant: number) {
    const h = floors * 3;
    const palette = variant % palettes.length;
    const color = Number.parseInt(palettes[palette]!.slice(1), 16);
    block(w + .5, .25, d + .5, 0xd2cbbd, x, .15, z);
    block(w, h, d, color, x, h / 2 + .25, z);
    const facade = facades[palette]!;
    pane(w - .18, h - .2, x, h / 2 + .3, z + d / 2 + .02, 0, facade);
    pane(w - .18, h - .2, x, h / 2 + .3, z - d / 2 - .02, Math.PI, facade);
    pane(d - .18, h - .2, x + w / 2 + .02, h / 2 + .3, z, Math.PI / 2, facade);
    pane(d - .18, h - .2, x - w / 2 - .02, h / 2 + .3, z, -Math.PI / 2, facade);
    block(w + .7, .35, d + .7, 0xd9d0bd, x, h + .4, z);
    if (floors > 5) {
      const setback = floors > 10 ? 7 : 3;
      block(w * .67, setback, d * .7, color, x, h + setback / 2 + .5, z);
      pane(w * .67, setback, x, h + setback / 2 + .5, z + d * .35 + .02, 0, facade);
      block(w * .74, .3, d * .77, 0xb8bcb6, x, h + setback + .6, z);
    }
    if (variant % 3 === 0) for (const side of [-1, 1]) block(.35, h, .35, 0xddd5bf, x + side * (w / 2 - .25), h / 2 + .2, z + d / 2 + .1);
    // Glazed storefront, awning and door occupy the ground floor of every block.
    block(w * .85, 2.4, .12, 0x46636a, x, 1.5, z + d / 2 + .05);
    block(w + .3, .35, 1.2, [0x42675b, 0x9d7153, 0x607b8b][variant % 3]!, x, 3.1, z + d / 2 + .35);
    for (let sx = -w / 2 + 1; sx < w / 2; sx += 2) block(.1, 2.4, .18, 0xd7d1c1, x + sx, 1.5, z + d / 2 + .15);
    block(1.4, .65, 1.2, 0x97a4a0, x + w / 4, h + .9, z - d / 4);
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
    // Close street walls, mixed height, stepped crowns and compact courtyards.
    const variant = Math.abs(Math.round(x * 7 + z * 3)) % 17;
    block(31, .08, 31, 0xc7c1b2, x, .04, z);
    for (const side of [-1, 1]) {
      const floors = 3 + (variant + (side + 1) * 3) % 9;
      building(x + side * 7.5, z - 6.5, 13, 14, floors, variant + side + 1);
      building(x + side * 7.5, z + 8, 13, 11, 2 + (variant + side + 1) % 5, variant + side + 3);
    }
  }
  const infill: [number, number, number, number, number][] = [
    [-30, 50, 6, 14, 4], [-30, 69, 6, 10, 3], [8, 73, 8, 5, 3], [29, 73, 8, 5, 4],
    [69, 12, 8, 15, 5], [48, 30, 6, 8, 3], [48, 58, 6, 19, 4], [72, 59, 6, 15, 3],
    [-26, -33, 10, 5, 3], [-12, -33, 9, 5, 4], [8, -31, 6, 7, 4], [28, -31, 10, 7, 5],
    [-70, 29, 7, 10, 3], [-49, 25, 6, 10, 5], [-70, -29, 7, 8, 3], [-49, -29, 6, 8, 4],
  ];
  infill.forEach(([x, z, w, d, floors], i) => building(x, z, w, d, floors, i));
  return { windows, buildingCount };
}
