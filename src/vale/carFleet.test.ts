import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createCarFleet } from './carFleet';
import type { CityCar } from './siliconValley';
function vehicle(scene: THREE.Scene, x: number, model = 'coupe'): CityCar {
  const mesh = new THREE.Group(); mesh.userData.model = model; mesh.position.x = x;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial({ color: 0xaa6644 }));
  body.position.x = 1.5; mesh.add(body); scene.add(mesh);
  return { mesh, axis: 'x', road: 0, direction: 1, position: x, speed: 5 };
}
describe('frota compartilhada', () => {
  it('compartilha o desenho sem perder a posição e os detalhes de cada carro', () => {
    const scene = new THREE.Scene(); const cars = [vehicle(scene, -10), vehicle(scene, 20), vehicle(scene, 30, 'van')];
    createCarFleet(scene, cars);
    const instances = scene.children.filter((obj): obj is THREE.InstancedMesh => obj instanceof THREE.InstancedMesh);
    expect(instances).toHaveLength(2); expect(instances[0]!.count).toBe(2);
    expect(scene.children.some(obj => cars.some(car => car.mesh === obj))).toBe(false);
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    instances[0]!.getMatrixAt(0, matrix); expect(position.setFromMatrixPosition(matrix).x).toBeCloseTo(-8.5);
    instances[0]!.getMatrixAt(1, matrix); expect(position.setFromMatrixPosition(matrix).x).toBeCloseTo(21.5);
  });
  it('acompanha mudanças de posição e direção sem recriar os modelos', () => {
    const scene = new THREE.Scene(); const car = vehicle(scene, 0); const fleet = createCarFleet(scene, [car]);
    const instance = scene.children[0] as THREE.InstancedMesh;
    const geometry = instance.geometry;
    car.mesh.position.set(5, .15, 8); car.mesh.rotation.y = Math.PI / 2; fleet.update();
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(); instance.getMatrixAt(0, matrix); position.setFromMatrixPosition(matrix);
    expect(position.x).toBeCloseTo(5); expect(position.z).toBeCloseTo(6.5); expect(instance.geometry).toBe(geometry); expect(instance.castShadow).toBe(false);
  });
});
