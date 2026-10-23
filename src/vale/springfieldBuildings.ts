import * as THREE from 'three';
import type { SpringfieldPlace } from './springfieldLocations';
import type { SpringfieldKit } from './springfieldKit';

export function drawSpringfieldBuilding(k: SpringfieldKit, p: SpringfieldPlace, group: THREE.Group) {
  const { box, sphere, cylinder, torus, hipRoof, window, tree, bench, sign } = k;
  const w = p.width, d = p.depth, face = d * .28;
  const body = (height = 9, color = p.color, width = w * .86, depth = d * .65) => { box(group, width, height, depth, color, 0, height / 2, 0, true); box(group, width + .3, .45, depth + .3, '#b4b3a3', 0, .22, 0); };
  const windows = (height: number, rows = 1) => { for (let row = 0; row < rows; row++) for (let x = -w * .28; x <= w * .29; x += w * .28) window(group, x, 2.8 + row * height, d * .326 + .15, w * .13, 2.5); };
  const door = (x = 0, z = face + .5, color = '#7e795b') => { box(group, 2.3, 3.8, .25, '#eee4c6', x, 1.9, z); box(group, 1.8, 3.35, .2, color, x, 1.7, z + .17); sphere(group, '#e5d79d', x + .55, 1.7, z + .35, .12); };
  const lawn = (color = '#89b965') => box(group, w, .12, d, color, 0, -.01, 0);
  const shopSign = (text: string, bg = '#f8edc8', ink = '#3b5844', height = 8) => sign(group, text, 0, height, d * .326 + .25, w * .77, 2.1, bg, ink);
  const shrubs = () => { for (const x of [-w * .38, w * .38]) sphere(group, '#6d9c55', x, .8, d * .4, 1.2, .9, 1.1); };

  if (p.model === 'simpsons') {
    lawn();
    box(group, 16, 9.4, 13, '#db9a7d', -4.5, 4.7, -1.5, true);
    hipRoof(group, 18, 15, 4.1, '#8c604c', -4.5, 9.4, -1.5);
    box(group, 10, 5.8, 13, '#dba18a', 8.3, 2.9, -.4, true); hipRoof(group, 11.2, 14, 2.3, '#8b5d4e', 8.3, 5.8, -.4);
    box(group, 8.5, 4.2, .2, '#d8d3bb', 8.4, 2.2, 6.24);
    for (let row = 0; row < 7; row++) box(group, 8.2, .07, .18, '#b4ae9a', 8.4, .4 + row * .56, 6.4);
    box(group, 8.5, .11, 7, '#bdc0b0', 8.4, .08, 9.7);
    for (const x of [-9, -1]) { window(group, x, 7.1, 5.12, 3, 2.55, '#83a178'); window(group, x - .3, 3.4, 5.12, 3.5, 2.65, '#83a178'); }
    box(group, 3.5, 4.6, 1.5, '#cb8a69', -5.2, 2.3, 5.6, true); door(-5.2, 6.46, '#8b7447');
    box(group, 3.8, .18, 6.2, '#c5bfa9', -5.2, .08, 9.2);
    box(group, 1.6, 4.2, 1.6, '#bc8069', -10, 10.5, -4); box(group, 1.9, .2, 1.9, '#a76f5e', -10, 12.7, -4);
    // Bay window, chimney, mailbox, hedges and the family backyard.
    window(group, -12.75, 3.5, 3.8, 2.2, 2.4, '#83a178');
    box(group, .16, 1.6, .16, '#8b7553', 12.4, .8, 11); box(group, .8, .65, .65, '#b5bac0', 12.4, 1.9, 11, true);
    for (let x = -13; x < 2; x += 2) sphere(group, '#6c9b55', x, .8, 10, 1.2, .8, .75);
    tree(group, -11, -9, 1.3); box(group, 3.8, 2.5, 3.7, '#b58b51', -11, 5.8, -9, true); hipRoof(group, 4.5, 4.2, 1.7, '#8c6750', -11, 7.05, -9);
    for (let i = 0; i < 8; i++) box(group, 1.3, .1, .25, '#bb9868', -9.1, 1 + i * .55, -7.7);
    return 14;
  }
  if (p.model === 'house' || p.model === 'flanders') {
    lawn(); const h = p.model === 'flanders' ? 10.4 : 6.5 + p.key.length % 3;
    body(h, p.color, w * .75, d * .63); hipRoof(group, w * .85, d * .73, 3, p.model === 'flanders' ? '#84725b' : '#877768', 0, h, 0);
    window(group, -w * .2, 3.2, d * .32 + .2, 2.5, 2.8); window(group, w * .2, 3.2, d * .32 + .2, 2.5, 2.8);
    if (h > 8) { window(group, -w * .2, 7.6, d * .32 + .2, 2.4, 2.4); window(group, w * .2, 7.6, d * .32 + .2, 2.4, 2.4); }
    door(0, d * .32 + .3); box(group, 2.5, .1, d * .2, '#c7bda5', 0, .04, d * .41); shrubs();
    const variant = p.key.length % 4;
    if (variant === 0) { box(group, w * .62, .25, 3, '#e2d7b4', 0, 4.5, d * .37); for (const x of [-w * .28, w * .28]) cylinder(group, .12, .15, 4.5, '#eee5ca', x, 2.25, d * .43, 8); }
    if (variant === 1) { box(group, 4, 3, .6, '#c9d7ca', -w * .2, 3, d * .34, true); window(group, -w * .2, 3.1, d * .34 + .4, 3.5, 2.4); }
    if (variant === 2) { box(group, w * .33, 3.8, d * .42, p.color, w * .33, 1.9, -d * .1); hipRoof(group, w * .4, d * .48, 1.5, '#8c7c64', w * .33, 3.8, -d * .1); }
    if (p.model === 'flanders') { tree(group, w * .37, -d * .3, .9); box(group, 1.1, 2, .8, '#738e67', w * .42, 1, d * .4, true); }
    return h + 3;
  }
  if (p.model === 'kwik') {
    body(7.8, '#e5d5bb'); box(group, w * .94, 1.2, d * .76, '#b74f45', 0, 7.8, 0);
    for (let band = 0; band < 3; band++) box(group, w * .94, .3, .3, ['#d88c3e', '#eee8c4', '#659774'][band]!, 0, 6.2 + band * .3, d * .385);
    window(group, -6.3, 3, face + 1.7, 7, 3.5, '#668e7b'); window(group, 6.3, 3, face + 1.7, 7, 3.5, '#668e7b'); door(0, face + 1.8, '#72a5a4');
    sign(group, 'KWIK-E-MART', 0, 7.6, d * .39 + .1, w * .77, 2.25, '#f4ecd3', '#bd4942');
    box(group, 1.8, 3.4, 1.3, '#c34a40', -w * .4, 1.7, d * .39, true); box(group, 1.6, 3, 1.3, '#90a6a8', w * .4, 1.5, d * .39, true);
    return 9;
  }
  if (p.model === 'krusty') {
    body(7, '#e4c78b'); box(group, w, .6, d * .76, '#ab4944', 0, 7.2, 0); windows(3); door(0, d * .33 + .3);
    shopSign('KRUSTY BURGER', '#e3c654', '#a4443b', 7.6);
    cylinder(group, .18, .22, 11, '#8c9590', w * .38, 5.5, d * .4);
    const faceGroup = new THREE.Group(); faceGroup.position.set(w * .38, 12, d * .4); group.add(faceGroup);
    sphere(faceGroup, '#edcc81', 0, 0, 0, 1.9, 2.2, .9);
    for (const side of [-1, 1]) { sphere(faceGroup, '#7eaa9c', side * 1.8, .2, 0, .95); sphere(faceGroup, '#fff2d0', side * .6, .5, .8, .6); sphere(faceGroup, '#303f3e', side * .6, .52, 1.34, .18); }
    sphere(faceGroup, '#b95145', 0, -.15, 1, .45); box(faceGroup, 1.6, .45, .2, '#f4e4c8', 0, -.9, .95, true);
    return 15;
  }
  if (p.model === 'moe') {
    body(9, '#79968c'); box(group, w * .9, .55, d * .7, '#516f69', 0, 9, 0);
    for (const x of [-7, 7]) { window(group, x, 4.1, d * .33 + .2, 5.2, 3.6, '#536e59'); for (let j = -2; j <= 2; j++) { const line = box(group, .12, 4, .12, '#bd9a6a', x + j * .65, 4.1, d * .33 + .6); line.rotation.z = .65; } }
    door(0, d * .33 + .4, '#926a4d'); shopSign("MOE'S", '#e8d49a', '#795a45', 8.3); return 10;
  }
  if (p.model === 'donuts') {
    body(8); hipRoof(group, w * .93, d * .76, 3, '#be7760', 0, 8, 0); windows(4); door(0, d * .33 + .3); shopSign('LARD LAD DONUTS', '#e5cca4', '#97644b', 8);
    const statue = new THREE.Group(); statue.position.set(w * .3, 0, -d * .05); group.add(statue);
    sphere(statue, '#ede2c9', 0, 10.5, 0, 2.2, 2.5, 1.7); sphere(statue, '#ebc77f', 0, 14, .15, 1.7, 1.9, 1.5);
    for (const x of [-.9, .9]) { cylinder(statue, .65, .7, 4, '#83a6bb', x, 6.8, 0); sphere(statue, '#625a53', x, 4.5, .45, .8, .55, 1.1); }
    cylinder(statue, .45, .6, 4, '#e6bb78', 2.2, 13, 0).rotation.z = -.45;
    const donut = torus(statue, 2.6, .75, '#d59b6b', 3.1, 17.2, 0); donut.rotation.y = -.15;
    torus(statue, 2.65, .5, '#d89ca8', 3.1, 17.2, .45); return 21;
  }
  if (p.model === 'school') {
    body(8, '#d9ad95'); box(group, 13, 4, d * .65, '#cb9684', 0, 10, 0); hipRoof(group, w * .92, d * .75, 2.3, '#9a7365', 0, 8.1, 0);
    for (const x of [-15, -9, 9, 15]) window(group, x, 4, d * .326 + .2, 3.8, 3);
    door(-2, d * .33 + .3); door(2, d * .33 + .3); shopSign('SPRINGFIELD ELEMENTARY', '#e6c3a4', '#795345', 9.1);
    cylinder(group, .1, .1, 9, '#9faaa4', -w * .42, 4.5, d * .38, 8); box(group, 3.5, 2, .12, '#b56b64', -w * .38, 8, d * .38);
    return 13;
  }
  if (p.model === 'plant') {
    const nuclear = p.key === 'plant'; body(12, nuclear ? '#a7b9a4' : '#b97660');
    if (nuclear) for (const x of [-w * .27, w * .27]) {
      const points = [[0, 0], [6.7, 0], [6.4, 3], [5.6, 8], [4.4, 16], [4.6, 24], [5.7, 28]].map(([r, y]) => new THREE.Vector2(r!, y!));
      const tower = new THREE.LatheGeometry(points, 24); k.mesh(group, tower, '#bac4b3', x, 0, -d * .18);
      torus(group, 5.75, .28, '#8d9f91', x, 28, -d * .18).rotation.x = Math.PI / 2;
    } else for (const x of [-14, 0, 14]) cylinder(group, 4, 4.2, 18, '#bdc0b7', x, 9, -5, 16);
    for (const x of [-w * .3, 0, w * .3]) cylinder(group, 1.1, 1.5, nuclear ? 34 : 23, nuclear ? '#be927c' : '#c7b9a5', x, nuclear ? 17 : 11.5, d * .12);
    box(group, w * .86, 1.8, 1.5, '#7d9383', 0, 13, d * .33);
    shopSign(nuclear ? 'SPRINGFIELD NUCLEAR POWER' : 'DUFF BREWERY', '#e9dfb7', nuclear ? '#445d49' : '#a1433c', 11);
    return nuclear ? 35 : 25;
  }
  if (p.model === 'church') {
    body(12, '#dcc6bf', w * .72, d * .72); hipRoof(group, w * .8, d * .8, 5, '#9a7689', 0, 12, 0);
    box(group, 8, 20, 8, '#d2b6bd', 0, 10, d * .23); cylinder(group, 0, 5.4, 9, '#87758b', 0, 24.5, d * .23, 4).rotation.y = Math.PI / 4;
    box(group, .4, 3.8, .4, '#ede0c5', 0, 30, d * .23); box(group, 2.2, .4, .4, '#ede0c5', 0, 30.6, d * .23);
    window(group, 0, 13, d * .35 + .2, 3.5, 4, '#f0d9bc'); door(0, d * .37 + .3); return 33;
  }
  if (p.model === 'stadium' || p.model === 'lake' || p.model === 'park') {
    lawn(p.model === 'lake' ? '#b4be8b' : '#85b66c');
    if (p.model === 'stadium') {
      const ring = torus(group, 15, 3.4, '#a7afa8', 0, 3.2, 0); ring.rotation.x = Math.PI / 2; ring.scale.set(1.35, 1, .7);
      box(group, 27, .15, 22, '#76a969', 0, .15, 0);
      for (const x of [-10, 10]) box(group, .18, .08, 17, '#e8e4be', x, .27, 0);
      for (const x of [-w * .4, w * .4]) { cylinder(group, .12, .2, 18, '#8b9a91', x, 9, -d * .33); box(group, 4.8, 2, .8, '#e9dfb7', x, 18, -d * .33); }
    } else if (p.model === 'lake') {
      const water = cylinder(group, 18, 18, .15, '#74adb4', 0, .23, 0, 48); water.scale.x = 1.16;
      for (let i = 0; i < 9; i++) { const angle = i * .7; tree(group, Math.cos(angle) * 22, Math.sin(angle) * 20, .8 + i % 3 * .15); }
      box(group, 4, .3, 12, '#b18b62', 2, .45, 14); bench(group, -14, 11);
    } else if (p.key === 'krustyland') {
      const wheel = torus(group, 11, .35, '#c58d70', 0, 13, 0);
      for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; const spoke = box(group, .15, 22, .15, '#e8cc90', 0, 13, 0); spoke.rotation.z = angle; box(group, 2.5, 2.8, 2.3, ['#e4ae66', '#89b5b7', '#d69aa7'][i % 3]!, Math.sin(angle) * 10.8, 13 + Math.cos(angle) * 10.8, 0, true); }
      wheel.rotation.y = .1; box(group, 1, 12, 1, '#929e93', -4, 6, 0); box(group, 1, 12, 1, '#929e9a', 4, 6, 0);
    } else if (p.key === 'cemetery') {
      for (let x = -15; x <= 15; x += 7.5) for (let z = -10; z <= 10; z += 10) { box(group, 2.2, 2.1, .6, '#a8afa0', x, 1.05, z, true); sphere(group, '#a8afa0', x, 2.1, z, 1.1, .5, .3); box(group, .15, .8, .1, '#879584', x, 1.5, z + .35); box(group, .6, .12, .1, '#879584', x, 1.55, z + .35); }
      tree(group, -19, -15, 1.3); tree(group, 19, -15, 1.3);
    } else {
      cylinder(group, Math.min(w, d) * .25, Math.min(w, d) * .25, .1, '#d6cbaa', 0, .15, 0, 32);
      cylinder(group, 2.4, 2.8, 1.5, '#b4b5a0', 0, .9, 0); box(group, 1.2, 3.5, .9, '#7b9a89', 0, 3.1, 0, true); sphere(group, '#7b9a89', 0, 5.4, 0, .75);
      for (const x of [-w * .35, w * .35]) { tree(group, x, -d * .24, 1.15); bench(group, x, d * .25); }
    }
    return p.key === 'krustyland' ? 26 : p.model === 'stadium' ? 21 : 9;
  }
  if (p.model === 'mansion') {
    lawn('#88ad73'); body(13, p.color, w * .74, d * .7); hipRoof(group, w * .84, d * .8, 4.5, '#717f81', 0, 13, 0); windows(5, 2);
    for (const x of [-w * .29, w * .29]) { box(group, 8, 16, 9, '#bcbdb0', x, 8, d * .14); hipRoof(group, 9, 10, 4, '#697d7e', x, 16, d * .14); }
    for (const x of [-3.5, 3.5]) cylinder(group, .55, .65, 7.4, '#e0d5bc', x, 3.7, d * .39);
    door(0, d * .4 + .3); tree(group, -w * .4, -d * .34, 1.3); tree(group, w * .4, -d * .34, 1.3); return 21;
  }
  if (p.model === 'airport' || p.model === 'port') {
    body(7, '#b5c5bd', w * .75, d * .46); windows(3); shopSign(p.key === 'bus' ? 'SPRINGFIELD TRANSIT' : p.model === 'port' ? 'SPRINGFIELD HARBOR' : 'SPRINGFIELD AIRPORT', '#e9dcbc', '#586d62', 7.6);
    if (p.model === 'port') {
      for (let i = 0; i < 4; i++) box(group, w * .7, .3, 1, '#b79164', 0, .2, d * .2 + i * 2);
      for (const x of [-10, 10]) { cylinder(group, .2, .35, 20, '#8c9790', x, 10, -3); box(group, .5, .5, 20, '#c8ac73', x, 20, 3); }
    } else if (p.key !== 'bus') {
      box(group, 6, .12, 28, '#86968e', w * .32, .1, 0); cylinder(group, 3, 3.6, 12, '#bfcac5', -w * .25, 6, -d * .1, 12); sphere(group, '#92b7be', -w * .25, 13, -d * .1, 3.8, 1.5, 3.8);
      sphere(group, '#e9e2cc', 8, 1.5, 8, 1, 1, 6); box(group, 12, .18, 2, '#e9e2cc', 8, 1.8, 8); box(group, 4, .18, 1.5, '#e9e2cc', 8, 1.7, 3); box(group, .2, 2.2, 1.8, '#7f9ea8', 8, 2.3, 3);
    }
    return p.model === 'port' ? 22 : 16;
  }
  const civic = p.model === 'civic', bowling = p.model === 'bowling';
  body(civic ? 12 : bowling ? 8 : p.model === 'mall' ? 12 : 8);
  windows(4.6, civic || p.model === 'mall' ? 2 : 1);
  box(group, w * .93, .7, d * .75, '#a39882', 0, civic ? 12 : p.model === 'mall' ? 12 : 8, 0);
  if (civic) {
    for (const x of [-w * .27, -w * .09, w * .09, w * .27]) cylinder(group, .5, .65, 7.5, '#e7dec4', x, 3.75, d * .39);
    box(group, w * .7, .5, 4, '#d9d0b9', 0, 7.7, d * .36); hipRoof(group, w * .73, 4.7, 3, '#c5bca4', 0, 7.9, d * .36);
    if (p.key === 'hospital') { box(group, 1, 4, .35, '#bb6259', 0, 14.5, 0); box(group, 4, 1, .35, '#bb6259', 0, 14.5, 0); }
    if (p.key === 'townhall' || p.key === 'observatory') { sphere(group, '#a5b5aa', 0, 14, -2, 5, 4, 5); cylinder(group, .12, .2, 4, '#87988b', 0, 18, -2); }
  }
  if (bowling) {
    for (const x of [-5, 5]) { sphere(group, '#ede8cc', x, 12, 0, 1.4, 3.5, 1.4); torus(group, .8, .2, '#c87164', x, 13.6, 1.1); }
    shopSign('BARNEY’S BOWLARAMA', '#e8d9ae', '#668b8d', 7.4);
  } else {
    const text = p.key === 'bank' ? 'SPRINGFIELD BANK' : p.key === 'comic' ? 'ANDROID’S DUNGEON' : p.key === 'gas' ? 'GAS & GO' : p.key === 'cinema' ? 'AZTEC THEATER' : p.name.toUpperCase();
    shopSign(text, civic ? '#dcd5bf' : '#f2ddaa', '#53665a', civic ? 11.2 : p.model === 'mall' ? 11 : 7.6);
  }
  door(0, d * .39 + .2); shrubs();
  if (p.key === 'gas') for (const x of [-7, 7]) { box(group, 2, 3, 1.5, '#bf6861', x, 1.5, d * .43, true); box(group, 1.4, 1, .12, '#e0e8db', x, 2, d * .46); }
  if (p.key === 'prison') { for (let x = -w * .39; x <= w * .4; x += 1.2) box(group, .12, 4, .12, '#7c887f', x, 2, d * .46); box(group, w * .8, .15, .15, '#7c887f', 0, 4, d * .46); }
  if (p.key === 'cinema') { box(group, w * .75, .35, 5, '#b86d5a', 0, 5.9, d * .4); for (let x = -w * .34; x <= w * .35; x += 2) { const lamp = sphere(group, '#f6da83', x, 5.7, d * .49, .2); lamp.userData.window = true; } }
  if (p.key === 'comic' || p.key === 'pizza' || p.key === 'restaurant') for (let i = 0; i < 10; i++) { const awning = box(group, w * .075, .22, 3.2, i % 2 ? '#e7d5b0' : p.key === 'comic' ? '#ae8ab0' : '#aa7760', -w * .34 + i * w * .075, 5.5, d * .36); awning.rotation.x = .17; }
  return civic ? 21 : p.model === 'mall' ? 14 : bowling ? 17 : 10;
}
