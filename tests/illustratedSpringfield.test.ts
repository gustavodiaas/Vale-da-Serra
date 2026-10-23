import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { ART_WIDTH, ART_HEIGHT, ART_URL, ILLUSTRATED_PLACES, artPoint, fitIllustration } from '../src/vale/illustratedLayout';
import { buildIllustratedSpringfield } from '../src/vale/illustratedSpringfield';

describe('Approved illustrated Springfield map', () => {
  it('ships the approved 3:2 painting and assigns every existing destination an image region', () => {
    const png = readFileSync(`public/${ART_URL}`);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1536); expect(png.readUInt32BE(20)).toBe(1024);
    expect(ILLUSTRATED_PLACES).toHaveLength(116);
    expect(new Set(ILLUSTRATED_PLACES.map(p => p.key)).size).toBe(116);
    for (const place of ILLUSTRATED_PLACES) { expect(Math.abs(place.x)).toBeLessThan(ART_WIDTH / 2); expect(Math.abs(place.z)).toBeLessThan(ART_HEIGHT / 2); expect(place.width).toBeGreaterThan(0); }
    const home = ILLUSTRATED_PLACES.find(p => p.key === 'simpsons')!;
    expect(home.x).toBeCloseTo(artPoint(.31, .345)[0]);
  });
  it('loads the painting, retains selection and actions, and keeps the illustration at two triangles', async () => {
    const scene = new THREE.Scene(), texture = new THREE.Texture();
    const city = buildIllustratedSpringfield(scene, async () => texture); await city.ready;
    scene.updateMatrixWorld(true);
    expect(city.buildings).toHaveLength(116);
    for (const b of city.buildings) {
      const ray = new THREE.Raycaster(b.group.position.clone().add(new THREE.Vector3(0, 20, 0)), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(b.group, true).length).toBeGreaterThan(0);
      expect(b.place.purpose).toBeTruthy();
    }
    const map = scene.children[0]!.children.find(o => o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial && o.material.map === texture) as THREE.Mesh;
    expect(map.geometry.index!.count).toBe(6);
    expect(scene.children[0]!.children.filter(o => o instanceof THREE.Sprite)).toHaveLength(32);
    const actor = city.people.actors[0]!, x = actor.x; city.update(10); expect(actor.x).not.toBe(x);
    city.setNight(true); expect((map.material as THREE.MeshBasicMaterial).color.r).toBeLessThan(1); city.setNight(false);
    city.select('kwik'); expect(scene.children[0]!.children.some(o => o instanceof THREE.Mesh && o.geometry instanceof THREE.RingGeometry && o.visible)).toBe(true);
    const camera = new THREE.OrthographicCamera(); fitIllustration(camera, 420, 1920, 1080);
    expect(camera.top - camera.bottom).toBeCloseTo(273);
    camera.up.set(0, 0, -1); camera.position.set(0, 600, 0); camera.lookAt(0, 0, 0);
    fitIllustration(camera, ART_HEIGHT / .65, 1536, 1024); camera.updateMatrixWorld();
    const corner = new THREE.Vector3(...[artPoint(0, 0)[0], 0, artPoint(0, 0)[1]] as [number, number, number]).project(camera);
    expect(corner.x).toBeCloseTo(-1, 5); expect(corner.y).toBeCloseTo(1, 5);
    city.cancel(); city.people.dispose(); texture.dispose();
  });
  it('disposes an image that finishes loading after the map was cancelled', async () => {
    let finish!: (texture: THREE.Texture) => void;
    const scene = new THREE.Scene(), texture = new THREE.Texture(); let disposed = false; texture.addEventListener('dispose', () => { disposed = true; });
    const city = buildIllustratedSpringfield(scene, () => new Promise(resolve => { finish = resolve; }));
    city.cancel(); finish(texture); await city.ready; expect(disposed).toBe(true); city.people.dispose();
  });
});
