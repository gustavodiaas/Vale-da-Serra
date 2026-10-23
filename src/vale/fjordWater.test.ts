import { expect, it } from 'vitest';
import * as THREE from 'three';
import { createFjordWater } from './fjordWater';

it('binds animated water and a local depth map without rewriting the water mesh each frame', () => {
  const water = createFjordWater(), material = water.mesh.material;
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms) } as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  expect(shader.vertexShader).toContain('vFjord =');
  expect(shader.vertexShader).not.toContain('#include <beginnormal_vertex>');
  expect(shader.fragmentShader).toContain('texture2D(fjordDepth');
  expect(shader.uniforms.fjordDepth!.value.image.data).toBeInstanceOf(Uint8Array);
  const positions = water.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const version = positions.version;
  water.update(12);
  expect(shader.uniforms.fjordTime!.value).toBe(12);
  expect(positions.version).toBe(version);
});
