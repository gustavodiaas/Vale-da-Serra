import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function boatGeometry(sail: boolean) {
  const pieces: THREE.BufferGeometry[] = [];
  function part(geometry: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0, angle = 0) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); geometry.dispose();
    g.rotateX(angle); g.translate(x, y, z);
    const colors = new Float32Array(g.getAttribute('position').count * 3), c = new THREE.Color(color);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal'].includes(key)) g.deleteAttribute(key);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); pieces.push(g);
  }
  const positions: number[] = [], indices: number[] = [];
  const profile = [[-1, .55], [-.92, .02], [-.5, -.4], [0, -.52], [.5, -.4], [.92, .02], [1, .55]];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, beam = .06 + Math.sin(Math.PI * t) ** .65 * 1.18;
    for (const [x, y] of profile) positions.push(x! * beam, y! + Math.abs(t - .5) ** 3 * 2, (t - .5) * 7);
    if (i < 20) for (let j = 0; j < 6; j++) { const a = i * 7 + j; indices.push(a, a + 7, a + 1, a + 1, a + 7, a + 8); }
  }
  const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); hull.setIndex(indices); hull.computeVertexNormals();
  part(hull, sail ? '#ad6550' : '#527e85');
  const deck = new THREE.Shape(); deck.moveTo(0, -3.3); deck.bezierCurveTo(-1.5, -2.2, -1.45, 1.6, 0, 3.3); deck.bezierCurveTo(1.45, 1.6, 1.5, -2.2, 0, -3.3);
  part(new THREE.ShapeGeometry(deck, 18), '#b9986f', 0, .5, 0, -Math.PI / 2);
  part(new RoundedBoxGeometry(1.5, .9, 1.7, 2, .15), '#f1dfb9', 0, .87, -.6);
  part(new RoundedBoxGeometry(1.35, .45, 1.5, 2, .08), '#8ca9a9', 0, 1.17, -.55);
  part(new RoundedBoxGeometry(1.8, .12, 1.9, 2, .04), '#efe4c9', 0, 1.46, -.6);
  for (const z of [-2.1, 1.7]) part(new RoundedBoxGeometry(1.65, .12, .4, 1, .04), '#d9b783', 0, .58, z);
  if (sail) {
    part(new THREE.CylinderGeometry(.055, .075, 7, 10), '#dfd4b8', 0, 3.5, .35);
    for (const side of [-1, 1]) {
      const vertices: number[] = [], triangles: number[] = [], n = 8;
      for (let v = 0; v <= n; v++) for (let u = 0; u <= n; u++) {
        const a = u / n, b = v / n;
        vertices.push(side * a * (1 - b) * (side > 0 ? 2.7 : 1.9), 1.8 + b * (side > 0 ? 4.9 : 4.1), .35 + Math.sin(a * Math.PI) * Math.sin(b * Math.PI) * .55);
        if (u < n && v < n) { const i = v * (n + 1) + u; triangles.push(i, i + 1, i + n + 1, i + 1, i + n + 2, i + n + 1); }
      }
      const cloth = new THREE.BufferGeometry(); cloth.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); cloth.setIndex(triangles); cloth.computeVertexNormals(); part(cloth, '#f5e6bb');
    }
  } else part(new RoundedBoxGeometry(.7, 1.15, .55, 2, .12), '#3d5559', 0, .18, -3.1);
  const result = mergeGeometries(pieces)!; pieces.forEach(p => p.dispose()); return result;
}

export function createFjordBoats(parent: THREE.Group) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .58, side: THREE.DoubleSide });
  const sailing = new THREE.Group(), moored = new THREE.Group();
  sailing.add(new THREE.Mesh(boatGeometry(true), material)); moored.add(new THREE.Mesh(boatGeometry(false), material));
  sailing.name = 'sailing-boat'; moored.name = 'harbor-boat'; parent.add(sailing, moored);
  const ropes = new THREE.BufferGeometry(); ropes.setAttribute('position', new THREE.Float32BufferAttribute([16, 1.95, 63, 18.4, .42, 62.6, 16, 1.95, 67, 18.4, .42, 67], 3));
  parent.add(new THREE.LineSegments(ropes, new THREE.LineBasicMaterial({ color: '#887258' })));
  const wakeGeometry = new THREE.BufferGeometry();
  wakeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, -2.3, -2.2, 0, -10, -1.5, 0, -9.8, .5, 0, -2.3, 1.5, 0, -9.8, 2.2, 0, -10], 3));
  const wake = new THREE.Mesh(wakeGeometry, new THREE.MeshBasicMaterial({ color: '#d3e5d8', transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide })); sailing.add(wake); wake.position.y = .08;
  const curve = new THREE.CatmullRomCurve3([[30, 90], [85, 80], [91, 15], [88, -50], [96, -95], [105, -25], [104, 70], [60, 106]].map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  function update(seconds: number) {
    const t = (seconds / 240 + .12) % 1, point = curve.getPointAt(t), tangent = curve.getTangentAt(t);
    sailing.position.set(point.x, -.24 + Math.sin(seconds * 1.4) * .045, point.z); sailing.rotation.set(Math.sin(seconds * .8) * .018, Math.atan2(tangent.x, tangent.z), Math.sin(seconds * 1.1) * .035);
    moored.position.set(19.5, -.24 + Math.sin(seconds * 1.2 + 1) * .045, 65); moored.rotation.set(Math.sin(seconds) * .02, .12, Math.cos(seconds * .8) * .035);
  }
  update(0);
  return { count: 2, update, boats: [sailing, moored] };
}
