import * as THREE from 'three';
import { heightAt } from './nordicTerrain';

export function createFjordWater() {
  const size = 256, depths = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) depths[z * size + x] = Math.round(Math.min(1, Math.max(0, (heightAt(x / (size - 1) * 440 - 220, z / (size - 1) * 440 - 220) + 10) / 90)) * 255);
  const depthTexture = new THREE.DataTexture(depths, size, size, THREE.RedFormat);
  depthTexture.minFilter = depthTexture.magFilter = THREE.LinearFilter;
  depthTexture.needsUpdate = true;
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .26, metalness: .18 });
  material.userData.depthTexture = depthTexture;
  material.onBeforeCompile = shader => {
    shader.uniforms.fjordTime = time; shader.uniforms.fjordDepth = { value: depthTexture };
    shader.vertexShader = `uniform float fjordTime; varying vec3 vFjord;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      float dx = .028*cos(position.x*.23+fjordTime*.65)+.012*cos(position.x*.51+position.z*.27-fjordTime*.9);
      float dz = .021*cos(position.z*.31-fjordTime*.55)+.007*cos(position.x*.51+position.z*.27-fjordTime*.9);
      vec3 objectNormal = normalize(vec3(-dx, 1.0, -dz));
    `).replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      transformed.y += sin(position.x*.23+fjordTime*.65)*.12+sin(position.z*.31-fjordTime*.55)*.07;
      vFjord = (modelMatrix*vec4(transformed,1.0)).xyz;
    `);
    shader.fragmentShader = `uniform float fjordTime; uniform sampler2D fjordDepth; varying vec3 vFjord;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float bottom = texture2D(fjordDepth,(vFjord.xz+220.0)/440.0).r*90.0-10.0;
      float depth = max(0.0,-.25-bottom);
      vec3 shallow = vec3(.20,.47,.45);
      vec3 deep = vec3(.055,.23,.29);
      float ripple = sin(vFjord.x*1.8+vFjord.z*.6+fjordTime)*sin(vFjord.z*1.4-fjordTime*.7);
      float foam = (1.0-smoothstep(.2,1.45,depth))*smoothstep(.15,.8,sin(depth*8.0-fjordTime*1.25+ripple*.5));
      diffuseColor.rgb = mix(shallow,deep,smoothstep(.4,7.0,depth));
      diffuseColor.rgb += ripple*.008;
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.72,.84,.75),foam*.48);
    `);
  };
  material.customProgramCacheKey = () => 'fjord-depth-ripples-v1';
  const geometry = new THREE.PlaneGeometry(440, 440, 48, 48); geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = -.25; mesh.name = 'fjord-water';
  return { mesh, update(seconds: number) { time.value = seconds; } };
}
