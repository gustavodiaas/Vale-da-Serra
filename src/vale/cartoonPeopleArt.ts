import * as THREE from 'three';
import { cartoonNight } from './cartoonLook';

export const CARTOON_PEOPLE = ['homer', 'marge', 'bart', 'lisa', 'maggie', 'apu', 'krusty-person', 'ned', 'wiggum', 'burns-person', 'neighbor', 'neighbor-blue'] as const;

/** Original vector drawings rasterised once into a shared walking-frame atlas. */
export function createPeopleArt() {
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = 512; canvas.height = CARTOON_PEOPLE.length * 256; }
  const ctx = canvas?.getContext('2d');
  if (ctx) for (let row = 0; row < CARTOON_PEOPLE.length; row++) for (let frame = 0; frame < 4; frame++) {
    ctx.save(); ctx.translate(frame * 128, row * 256); ctx.lineWidth = 2.8; ctx.strokeStyle = '#261f2c'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const kind = CARTOON_PEOPLE[row]!, yellow = kind === 'apu' ? '#c98a43' : '#ffd51f', stride = [0, 6, 0, -6][frame]!;
    const path = (d: string, fill: string | null = null, stroke = true) => { const shape = new Path2D(d); if (fill) { ctx.fillStyle = fill; ctx.fill(shape); } if (stroke) ctx.stroke(shape); };
    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, stroke = true) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) ctx.stroke(); };
    const rect = (x: number, y: number, w: number, h: number, fill: string) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); };
    const child = ['bart', 'lisa', 'maggie'].includes(kind), dress = ['marge', 'lisa', 'maggie'].includes(kind), wide = ['homer', 'wiggum'].includes(kind);
    const shirt = ({ homer: '#ffffff', marge: '#9bdb3d', bart: '#f36b24', lisa: '#ee4a2b', maggie: '#6ac4f4', apu: '#43a34e', 'krusty-person': '#cf8ade', ned: '#438c42', wiggum: '#3980d0', 'burns-person': '#3b7c75', neighbor: '#dc8756', 'neighbor-blue': '#679de0' } as Record<string, string>)[kind]!;
    const pants = kind === 'homer' || kind === 'bart' ? '#438ae2' : kind === 'wiggum' ? '#264b9b' : '#796455';
    const headY = kind === 'marge' ? 128 : 113, shoulder = kind === 'marge' ? 155 : 148;
    // Independently drawn arms and legs, with a four-frame walk cycle.
    for (const side of [-1, 1]) {
      const x = 64 + side * 13, move = kind === 'bart' ? 0 : stride * side;
      path(`M${x - 7} 198 L${x + 7} 198 L${x + 7 + move} 232 L${x - 6 + move} 232 Z`, dress || child ? yellow : pants);
      ellipse(x + move + 2, 234, 12, 5, kind === 'bart' ? '#4192ed' : kind === 'lisa' || kind === 'marge' ? '#ed5538' : '#35303a');
      const ax = 64 + side * (wide ? 31 : 22), arm = stride * side * .5;
      path(`M${ax} ${shoulder + 6} Q${ax + side * 12} 170 ${ax + arm + side * 4} 194 Q${ax + arm} 202 ${ax + arm - side * 6} 193 L${ax - side * 5} ${shoulder + 15} Z`, yellow);
      ellipse(ax + arm, 193, 6, 7, yellow);
    }
    if (dress) path(`M49 ${shoulder - 2} L79 ${shoulder - 2} Q84 174 94 218 Q65 225 35 218 Q43 172 49 ${shoulder - 2}Z`, shirt);
    else {
      path(`M${wide ? 37 : 45} ${shoulder - 3} Q64 ${shoulder - 10} ${wide ? 92 : 83} ${shoulder - 3} Q${wide ? 106 : 91} 167 ${wide ? 101 : 87} 194 L${wide ? 28 : 40} 194 Q${wide ? 21 : 35} 167 ${wide ? 37 : 45} ${shoulder - 3}Z`, shirt);
      rect(wide ? 29 : 41, 191, wide ? 71 : 45, child ? 18 : 15, pants);
    }
    if (kind === 'homer') { path('M50 145 L61 157 L64 145 M65 145 L72 157 L82 145', null); path('M84 169 L94 169 L94 180 L85 180', null); }
    if (kind === 'ned') path('M49 146 L62 158 L65 146 L72 158 L81 146Z', '#f3b4bd');
    if (kind === 'apu') path('M54 145 L73 145 L76 191 L52 191Z', '#ffc939');
    if (kind === 'burns-person') { path('M49 146 L64 160 L79 146 L73 174 L65 167 L55 175Z', '#e5f0e8'); path('M63 159 L69 159 L73 180 L66 187 L61 179Z', '#4b456b'); }
    if (kind === 'wiggum') { rect(29, 188, 71, 8, '#242535'); path('M80 162 L90 162 L92 171 L85 176 L78 170Z', '#ffcf31'); }
    if (kind === 'krusty-person') { path('M48 149 L64 155 L80 149 L78 165 L64 157 L51 165Z', '#3cbbc1'); }
    // Head silhouettes use the show's flat yellow, white eyes and black line work.
    if (kind === 'lisa' || kind === 'maggie') {
      let d = ''; for (let i = 0; i < 20; i++) { const angle = i * Math.PI / 10 - Math.PI / 2, r = i % 2 ? 23 : 33; d += `${i ? 'L' : 'M'}${64 + Math.cos(angle) * r} ${headY + Math.sin(angle) * r}`; } path(`${d}Z`, yellow);
    } else if (kind === 'bart') path('M40 135 L37 91 L45 96 L49 87 L56 95 L62 87 L68 94 L76 87 L80 95 L88 90 L88 130 Q81 149 57 145Z', yellow);
    else ellipse(64, headY, kind === 'burns-person' ? 20 : 25, kind === 'burns-person' ? 34 : 31, kind === 'krusty-person' ? '#fff4cc' : yellow);
    ellipse(39, headY + 7, 5, 7, yellow); ellipse(89, headY + 7, 5, 7, yellow);
    if (kind === 'marge') path('M43 107 Q30 99 37 87 Q28 77 36 67 Q31 55 39 48 Q34 34 47 30 Q49 17 64 23 Q79 15 85 30 Q98 30 92 45 Q102 54 94 65 Q102 78 94 87 Q102 99 86 109 Q64 98 43 107Z', '#2773dc');
    if (['ned', 'apu', 'neighbor', 'neighbor-blue'].includes(kind)) path('M40 105 Q32 83 54 80 Q84 75 90 95 L88 110 L80 99 Q58 104 43 98Z', kind === 'apu' ? '#25232e' : '#8d4e28');
    if (kind === 'burns-person') { path('M44 91 Q29 94 36 117 L45 120Z', '#c5d9d4'); path('M82 91 Q99 92 91 116 L84 121Z', '#c5d9d4'); }
    if (kind === 'krusty-person') { path('M40 97 Q24 81 22 98 Q7 102 23 114 Q18 129 41 124Z', '#39a978'); path('M87 98 Q105 79 109 98 Q124 103 108 113 Q114 130 89 124Z', '#39a978'); }
    const ey = headY - 3;
    ellipse(55, ey, 11, 13, '#ffffff'); ellipse(76, ey, 11, 13, '#ffffff');
    ellipse(58, ey + 1, 2.3, 3.1, '#231e2b', false); ellipse(78, ey + 1, 2.3, 3.1, '#231e2b', false);
    if (kind === 'homer') { ellipse(67, 132, 21, 13, '#d6a370'); path('M53 137 Q68 141 80 135', null); path('M53 86 Q46 70 54 72 Q61 72 62 84 M68 84 Q62 70 70 72 Q79 73 78 86', null); }
    else path(`M53 ${headY + 22} Q64 ${headY + 27} 77 ${headY + 20}`, null);
    path(`M65 ${ey + 7} Q${kind === 'burns-person' ? 100 : 87} ${ey + 8} ${kind === 'burns-person' ? 92 : 80} ${ey + 15} Q72 ${ey + 19} 66 ${ey + 14}`, yellow);
    if (kind === 'ned') { ellipse(54, ey, 13, 14, 'rgba(255,255,255,0)'); ellipse(78, ey, 13, 14, 'rgba(255,255,255,0)'); path(`M64 ${ey - 1} L66 ${ey - 1}`, null); path(`M47 ${headY + 14} Q62 ${headY + 4} 66 ${headY + 16} Q73 ${headY + 4} 85 ${headY + 15} Q77 ${headY + 25} 66 ${headY + 19} Q55 ${headY + 25} 47 ${headY + 14}Z`, '#985d32'); }
    if (kind === 'wiggum') { path('M39 93 Q33 70 64 70 Q95 70 91 94Z', '#327bd0'); path('M37 91 Q67 83 93 93 L90 99 L39 98Z', '#273b7c'); ellipse(65, 83, 5, 6, '#ffcf31'); }
    if (kind === 'marge') for (let i = 0; i < 7; i++) ellipse(46 + i * 6, 153 + Math.sin(i / 6 * Math.PI) * 4, 3.5, 3.5, '#f24f2d');
    if (kind === 'lisa') for (let i = 0; i < 7; i++) ellipse(46 + i * 6, 148 + Math.sin(i / 6 * Math.PI) * 5, 3.4, 3.4, '#ffffff');
    if (kind === 'maggie') { path('M55 84 L44 72 L43 89 L61 88 L72 74 L77 89 L61 90Z', '#62bff6'); ellipse(67, headY + 18, 8, 6, '#f24d2c'); ellipse(67, headY + 19, 4, 4, '#f6b552'); }
    if (kind === 'krusty-person') ellipse(72, ey + 13, 7, 7, '#f04a35');
    if (kind === 'bart') { path('M31 242 Q64 246 98 242', null); ellipse(43, 248, 4, 4, '#8c4ecb'); ellipse(85, 248, 4, 4, '#8c4ecb'); }
    ctx.restore();
  }
  const texture = canvas ? new THREE.CanvasTexture(canvas) : new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = true; texture.needsUpdate = true;
  const materials = CARTOON_PEOPLE.map((_, row) => Array.from({ length: 4 }, (_, frame) => {
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .15, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.uniforms.peopleCell = { value: new THREE.Vector4(.25, 1 / CARTOON_PEOPLE.length, frame / 4, 1 - (row + 1) / CARTOON_PEOPLE.length) };
      shader.uniforms.cartoonNight = cartoonNight;
      shader.fragmentShader = `uniform vec4 peopleCell; uniform float cartoonNight;\n${shader.fragmentShader}`.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          diffuseColor *= texture2D(map, vMapUv * peopleCell.xy + peopleCell.zw);
        #endif
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.58, 0.67, 0.9), cartoonNight);
      `);
    };
    material.customProgramCacheKey = () => 'springfield-drawn-people-v1'; return material;
  }));
  return { texture, materials };
}
