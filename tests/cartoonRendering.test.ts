import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cartoonColor, cartoonMaterial, cartoonNight, createCartoonCamera, frameCartoonCamera, createCartoonWater } from '../src/vale/cartoonLook';
import { createPeopleArt } from '../src/vale/cartoonPeopleArt';
import { buildSpringfield } from '../src/vale/springfieldCity';

function shaderFor(material: THREE.Material, lib: 'basic' | 'sprite') {
  const shader = { vertexShader: THREE.ShaderLib[lib].vertexShader, fragmentShader: THREE.ShaderLib[lib].fragmentShader, uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib[lib].uniforms) } as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer); return shader;
}

describe('Flat illustrated Springfield rendering', () => {
  it('uses an orthographic camera so distant objects do not shrink with perspective', () => {
    const camera = createCartoonCamera(); frameCartoonCamera(camera, 218, 1920, 1080);
    camera.position.set(0, 0, 500); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const a = new THREE.Vector3(10, 10, 0).project(camera), b = new THREE.Vector3(10, 10, -80).project(camera);
    expect(a.x).toBeCloseTo(b.x, 8); expect(a.y).toBeCloseTo(b.y, 8);
    frameCartoonCamera(camera, 109, 1920, 1080);
    expect(new THREE.Vector3(10, 10, 0).project(camera).y).toBeCloseTo(a.y * 2, 6);
  });
  it('binds discrete cel paint and shared night colours to Three shader sources', () => {
    const material = cartoonMaterial({ vertexColors: true }), shader = shaderFor(material, 'basic');
    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(shader.vertexShader).toContain('mat3(instanceMatrix) * celNormal');
    expect(shader.fragmentShader).toContain('float celBand = step(');
    expect(shader.uniforms.cartoonNight).toBe(cartoonNight);
    expect(cartoonColor('#eac568').getHexString()).toBe('ffd51f');
    const water = createCartoonWater(), waterShader = shaderFor(water.mesh.material, 'basic');
    water.update(5); expect(waterShader.uniforms.cartoonTime!.value).toBe(5);
    expect(waterShader.fragmentShader).toContain('float stroke =');
    material.dispose(); water.mesh.geometry.dispose(); water.mesh.material.dispose();
  });
  it('shares one atlas across all drawing frames and keeps every resident animated and selectable', async () => {
    const art = createPeopleArt(); expect(art.materials).toHaveLength(12);
    expect(new Set(art.materials.flat().map(m => m.map)).size).toBe(1);
    const a = shaderFor(art.materials[0]![0]!, 'sprite'), b = shaderFor(art.materials[5]![3]!, 'sprite');
    expect(a.uniforms.peopleCell!.value.toArray()).not.toEqual(b.uniforms.peopleCell!.value.toArray());
    expect(a.fragmentShader).toContain('vMapUv * peopleCell.xy + peopleCell.zw');
    art.materials.flat().forEach(m => m.dispose()); art.texture.dispose();
    const scene = new THREE.Scene(), city = buildSpringfield(scene); await city.ready;
    expect(city.people.actors.every(actor => actor.body instanceof THREE.Sprite)).toBe(true);
    const actor = city.people.actors[0]!, firstFrame = actor.body.material; city.update(.2);
    expect(actor.body.material).not.toBe(firstFrame);
    expect(city.buildings.filter(building => building.place.isCharacter)).toHaveLength(10);
    let perspectiveMaterials = 0;
    scene.traverse(object => { if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) perspectiveMaterials++; });
    expect(perspectiveMaterials).toBe(0);
    city.cancel(); city.people.dispose();
  });
});
