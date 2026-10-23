import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildNordicVale, NORDIC_ANCHORS } from '../src/vale/nordicVillage';
import { heightAt, NORDIC_VIEW } from '../src/vale/nordicTerrain';

const directory = resolve('public/models/nordic');
beforeAll(() => vi.stubGlobal('ProgressEvent', class extends Event {
  constructor(type: string, init: ProgressEventInit) { super(type); Object.assign(this, init); }
}));
afterAll(() => vi.unstubAllGlobals());
// CPU-only GLB validation: geometry is decoded by Three's actual loader. Images
// are checked on disk, then omitted from parsing because Node has no image API.
async function loadLocal(name: string) {
  const buffer = readFileSync(resolve(directory, `${name}.glb`));
  expect(buffer.toString('utf8', 0, 4)).toBe('glTF');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  for (const image of json.images ?? []) if (image.uri) expect(existsSync(resolve(directory, image.uri))).toBe(true);
  for (const material of json.materials ?? []) {
    delete material.pbrMetallicRoughness?.baseColorTexture;
    delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
    delete material.normalTexture; delete material.emissiveTexture; delete material.occlusionTexture;
  }
  delete json.images; delete json.textures;
  const binaryLength = buffer.readUInt32LE(20 + jsonLength);
  const binary = buffer.subarray(28 + jsonLength, 28 + jsonLength + binaryLength);
  json.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString('base64')}`;
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}

describe('Nordic scene resource and placement budget', () => {
  it('keeps the expanded village terrace flat and frames the western cliff on the left', () => {
    for (const x of [-58, -30, 0, 40]) for (const z of [-63, -30, 15, 37]) expect(heightAt(x, z)).toBeCloseTo(1.8, 4);
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 1, 700);
    const { radius, polar, azimuth, target } = NORDIC_VIEW;
    camera.position.set(target[0] + radius * Math.sin(polar) * Math.cos(azimuth), target[1] + radius * Math.cos(polar), target[2] + radius * Math.sin(polar) * Math.sin(azimuth));
    camera.lookAt(new THREE.Vector3(...target)); camera.updateMatrixWorld();
    const cliff = new THREE.Vector3(-100, heightAt(-100, -48), -48).project(camera);
    const village = new THREE.Vector3(0, 1.8, 0).project(camera);
    const fjord = new THREE.Vector3(85, 0, 0).project(camera);
    expect(cliff.x).toBeLessThan(village.x - .3);
    expect(fjord.x).toBeGreaterThan(village.x + .3);
  });
  it('loads all artist models, keeps the 11 financial destinations, and fits the scene budget', async () => {
    const scene = new THREE.Scene();
    const valley = buildNordicVale(scene, loadLocal);
    await valley.ready;
    expect(valley.buildings).toHaveLength(11);
    expect(new Set(valley.buildings.map(b => b.id)).size).toBe(11);
    let triangles = 0, meshes = 0;
    scene.updateMatrixWorld(true);
    scene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      meshes++;
      triangles += (obj.geometry.index?.count ?? obj.geometry.getAttribute('position').count) / 3 * (obj instanceof THREE.InstancedMesh ? obj.count : 1);
      const box = new THREE.Box3().setFromObject(obj);
      expect(Number.isFinite(box.max.y)).toBe(true);
    });
    expect(meshes).toBeLessThan(80);
    expect(triangles).toBeLessThan(250_000);
    for (const building of valley.buildings) {
      const box = new THREE.Box3().setFromObject(building.group);
      expect(box.min.y).toBeCloseTo(heightAt(building.group.position.x, building.group.position.z), 2);
      expect(box.max.y - box.min.y).toBeGreaterThan(3);
      expect(NORDIC_ANCHORS.find(a => a.id === building.id)!.position[1]).toBeGreaterThan(box.max.y);
    }
    const bytes = readdirSync(directory).filter(n => n.endsWith('.glb')).reduce((sum, n) => sum + statSync(resolve(directory, n)).size, 0);
    expect(bytes).toBeLessThan(2_000_000);
    console.info(`Nordic scene: ${meshes} meshes, ${Math.round(triangles)} triangles, ${bytes} GLB bytes`);
  });

  it('does not attach models after a scene was cancelled while loading', async () => {
    const scene = new THREE.Scene();
    const valley = buildNordicVale(scene, loadLocal);
    valley.cancel();
    await valley.ready;
    expect(valley.buildings).toHaveLength(0);
  });

  it('reports a missing model instead of silently leaving the village incomplete', async () => {
    const valley = buildNordicVale(new THREE.Scene(), async () => { throw new Error('offline'); });
    await expect(valley.ready).rejects.toThrow('Não foi possível carregar');
  });
});
