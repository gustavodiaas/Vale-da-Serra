import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createVillageResidents } from './villageResidents';
import { createFjordBoats } from './fjordBoats';
import { heightAt, shoreAt, bankAt } from './nordicTerrain';

describe('inhabited Nordic valley', () => {
  it('keeps both boats afloat throughout their routes', () => {
    const fleet = createFjordBoats(new THREE.Group());
    for (let seconds = 0; seconds < 480; seconds += 2) {
      fleet.update(seconds);
      for (const boat of fleet.boats) {
        expect(heightAt(boat.position.x, boat.position.z)).toBeLessThan(-.4);
        expect(Math.abs(boat.position.y + .24)).toBeLessThan(.05);
      }
    }
  });
  it('moves residents along dry paths and brings shopping bags back from stores', () => {
    const root = new THREE.Group();
    const residents = createVillageResidents(root, [{ x: 29.7, front: 3, door: -2, kind: 'mercado' }, { x: 32, front: 34, door: 29, kind: 'cafe' }]);
    const bodies = root.children[0] as THREE.InstancedMesh, bags = root.children[5] as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    residents.update(0); bodies.getMatrixAt(0, matrix); const first = matrix.clone();
    let bagSeen = false;
    for (let seconds = 0; seconds < 240; seconds += 3) {
      residents.update(seconds);
      for (let i = 0; i < residents.count; i++) {
        bodies.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
        expect(heightAt(position.x, position.z)).toBeGreaterThan(.5);
        expect(position.x).toBeGreaterThanOrEqual(13.49); expect(position.x).toBeLessThanOrEqual(32.01);
        expect(matrix.elements.every(Number.isFinite)).toBe(true);
        bags.getMatrixAt(i, matrix); if (matrix.elements[0]! ** 2 + matrix.elements[2]! ** 2 > .5) bagSeen = true;
      }
    }
    expect(bagSeen).toBe(true); bodies.getMatrixAt(0, matrix); expect(matrix.equals(first)).toBe(false);
    residents.update(5, true); const still = bodies.instanceMatrix.array.slice();
    residents.update(100, true); expect(bodies.instanceMatrix.array).toEqual(still);
  });
  it('has continuous shore heights and slopes instead of vertical step walls', () => {
    for (let z = -60; z <= 40; z += 10) {
      const x = bankAt(z);
      expect(Math.abs(heightAt(x - .001, z) - heightAt(x + .001, z))).toBeLessThan(.01);
    }
    for (let x = -50; x <= 40; x += 10) {
      const z = shoreAt(x);
      expect(Math.abs(heightAt(x, z - .001) - heightAt(x, z + .001))).toBeLessThan(.01);
    }
    for (let x = -160; x < -62; x++) expect(Math.abs(heightAt(x + 1, -35) - heightAt(x, -35))).toBeLessThan(1.6);
  });
});
