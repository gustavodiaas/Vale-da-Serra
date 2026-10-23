import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createWalkers } from './cityLife';

describe('rotinas dos moradores', () => {
  it('mantém a animação finita durante caminhada, compras e atividades na praia', () => {
    const scene = new THREE.Scene(); const residents = createWalkers(scene);
    for (let frame = 0; frame < 1200; frame++) residents.update(.05, frame * .05, false);
    for (const obj of scene.children) {
      if (!(obj instanceof THREE.InstancedMesh)) continue;
      expect(Array.from(obj.instanceMatrix.array).every(Number.isFinite)).toBe(true);
    }
  });
  it('faz um cliente entrar no estabelecimento e sair com sacola', () => {
    const scene = new THREE.Scene(); const residents = createWalkers(scene);
    const bodies = scene.getObjectByName('city-residents') as THREE.InstancedMesh;
    const bags = scene.getObjectByName('shopping-bags') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
    const inside: number[] = [];
    for (let i = 0; i < bodies.count; i++) { bodies.getMatrixAt(i, matrix); scale.setFromMatrixScale(matrix); if (scale.x < .01) inside.push(i); }
    expect(inside.length).toBeGreaterThan(0);
    for (let frame = 0; frame < 125; frame++) residents.update(.05, frame * .05, false);
    for (const i of inside) {
      bodies.getMatrixAt(i, matrix); expect(scale.setFromMatrixScale(matrix).x).toBeCloseTo(1);
      bags.getMatrixAt(i, matrix); expect(scale.setFromMatrixScale(matrix).x).toBeCloseTo(1);
    }
  });
  it('respeita movimento reduzido em todas as rotinas', () => {
    const scene = new THREE.Scene(); const residents = createWalkers(scene);
    const before = scene.children.filter(obj => obj instanceof THREE.InstancedMesh).map(obj => Array.from(obj.instanceMatrix.array));
    residents.update(5, 100, true);
    const after = scene.children.filter(obj => obj instanceof THREE.InstancedMesh).map(obj => Array.from(obj.instanceMatrix.array));
    expect(after).toEqual(before);
  });
});
