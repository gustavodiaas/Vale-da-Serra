import * as THREE from 'three';

export const cartoonNight = { value: 0 };
const palette: Record<string, string> = {
  '#eac568': '#ffd51f', '#edcc80': '#ffd51f', '#e4ba6d': '#ffd51f',
  '#eee7d2': '#ffffff', '#7195b5': '#438ae2', '#7196b5': '#397fe0',
  '#a3bd6b': '#9ad83b', '#de8a56': '#f36b24', '#d98655': '#f34b27',
  '#8cbfce': '#65bdf0', '#85bdce': '#65bdf0', '#6d91b8': '#2874d7',
  '#7f9e76': '#438c42', '#9a856c': '#8c7163', '#6a92ad': '#3980d0',
  '#5c7991': '#3462a3', '#60859e': '#3980d0', '#4b6a7d': '#243a77',
  '#d9a2b5': '#ce8ede', '#89b4a2': '#50ac72', '#85b2a2': '#42a679',
  '#d3ac6f': '#ca873c', '#739d77': '#50a34a', '#575943': '#29272c',
  '#db9a7d': '#efa076', '#dba18a': '#efa076', '#db9f80': '#efa076',
  '#8c604c': '#984f38', '#8b5d4e': '#984f38', '#83a178': '#69a353',
  '#c2a9d7': '#ba8dc7', '#89b965': '#75c94d', '#85b66c': '#75c94d',
  '#63995e': '#51a93c', '#6d9c55': '#51a93c', '#6c9b55': '#51a93c',
  '#8caf70': '#7acb4a', '#8fb36b': '#7acb4a', '#a8b78e': '#99cc68',
  '#d9d5bf': '#e3d6bc', '#777e7a': '#777b8d', '#ede2aa': '#ffe58a',
  '#c7cbb1': '#94cf62', '#7ea9b4': '#8ad4f3', '#39463d': '#201e29',
  '#f7f2dc': '#ffffff', '#b74f45': '#db3c32', '#d88c3e': '#f18a23',
  '#659774': '#48a54e', '#e5d5bb': '#f4ddba', '#e4c78b': '#ffce6b',
};

export function cartoonColor(hex: string) {
  if (palette[hex.toLowerCase()]) return new THREE.Color(palette[hex.toLowerCase()]);
  const color = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 }; color.getHSL(hsl);
  if (hsl.s > .08 && hsl.l > .08) color.setHSL(hsl.h, Math.min(.9, hsl.s * 1.45), Math.min(.78, hsl.l * 1.07));
  return color;
}

/** Unlit flat paint, with two discrete cel values instead of PBR reflections. */
export function cartoonMaterial(options: { vertexColors?: boolean; color?: string; window?: boolean } = {}) {
  const material = new THREE.MeshBasicMaterial({ vertexColors: options.vertexColors, color: options.color ? cartoonColor(options.color) : '#ffffff' });
  material.userData.cartoon = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.cartoonNight = cartoonNight;
    shader.vertexShader = `varying vec3 vCelNormal;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      vec3 celNormal = normal;
      #ifdef USE_INSTANCING
        celNormal = mat3(instanceMatrix) * celNormal;
      #endif
      vCelNormal = normalize(mat3(modelMatrix) * celNormal);
      #include <begin_vertex>
    `);
    shader.fragmentShader = `varying vec3 vCelNormal; uniform float cartoonNight;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `
      #include <color_fragment>
      float celBand = step(0.08, dot(normalize(vCelNormal), normalize(vec3(-0.5, 0.85, 0.4))));
      diffuseColor.rgb *= mix(0.78, 1.0, celBand);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.46, 0.56, 0.78), cartoonNight);
      ${options.window ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.71, 0.19), cartoonNight);' : ''}
    `);
  };
  material.customProgramCacheKey = () => options.window ? 'springfield-cel-window-v1' : 'springfield-cel-paint-v1';
  return material;
}

export function createCartoonCamera() { return new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2200); }
export function frameCartoonCamera(camera: THREE.OrthographicCamera, radius: number, width: number, height: number) {
  const vertical = radius * (width < height ? .82 : .65);
  camera.top = vertical / 2; camera.bottom = -vertical / 2;
  camera.right = vertical * width / height / 2; camera.left = -camera.right;
  if (width > 900) camera.setViewOffset(width, height, -Math.min(160, width * .1), 0, width, height);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

export function createCartoonWater() {
  const material = new THREE.MeshBasicMaterial({ color: '#51bbed' }), time = { value: 0 };
  material.userData.cartoon = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.cartoonTime = time; shader.uniforms.cartoonNight = cartoonNight;
    shader.vertexShader = `varying vec3 vDrawnWater;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDrawnWater = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 vDrawnWater; uniform float cartoonTime; uniform float cartoonNight;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `
      #include <color_fragment>
      float stroke = 1.0 - smoothstep(0.025, 0.06, abs(sin(vDrawnWater.z * 0.22 + sin(vDrawnWater.x * 0.06 + cartoonTime * 0.18) * 0.55)));
      stroke *= smoothstep(0.55, 0.8, sin(vDrawnWater.x * 0.15 + vDrawnWater.z * 0.07));
      float coast = 1.0 - smoothstep(0.4, 1.2, abs(vDrawnWater.x - 242.5));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.94, 1.0), max(stroke * 0.4, coast * 0.85));
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.36, 0.48, 0.7), cartoonNight);
    `);
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), material); mesh.position.y = -.25; mesh.name = 'Drawn ocean';
  return { mesh, update(seconds: number) { time.value = seconds; } };
}
