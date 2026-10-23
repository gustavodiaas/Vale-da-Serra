import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildSpringfield, springfieldHeightAt } from '../src/vale/springfieldCity';
import { ALL_SPRINGFIELD_PLACES, SPRINGFIELD_PLACES, SPRINGFIELD_CHARACTERS, SPRINGFIELD_ROADS, SPRINGFIELD_VIEW } from '../src/vale/springfieldLocations';
import { sampleWalk, streetRoute } from '../src/vale/springfieldPeople';
import { destinationAction } from '../src/vale/springfieldActions';

describe('Springfield city and usable destinations', () => {
  it('contains the city districts, iconic places, homes and ten named characters', () => {
    expect(SPRINGFIELD_PLACES.length).toBeGreaterThan(65);
    expect(new Set(ALL_SPRINGFIELD_PLACES.map(p => p.key)).size).toBe(ALL_SPRINGFIELD_PLACES.length);
    for (const key of ['simpsons', 'flanders', 'kwik', 'krusty', 'plant', 'burns', 'moe', 'school', 'bank', 'lake', 'airport', 'port', 'krustyland']) expect(SPRINGFIELD_PLACES.find(p => p.key === key)).toBeDefined();
    expect(SPRINGFIELD_CHARACTERS).toHaveLength(10);
    for (const place of ALL_SPRINGFIELD_PLACES) { expect(place.panel).toBeTruthy(); expect(place.purpose.length).toBeGreaterThan(15); }
    for (const x of SPRINGFIELD_ROADS) for (const z of SPRINGFIELD_ROADS) expect(springfieldHeightAt(x, z)).toBeCloseTo(.12);
  });
  it('builds a pickable proxy for every destination, preserves the whole city at all levels and animates residents', async () => {
    const scene = new THREE.Scene(), city = buildSpringfield(scene); await city.ready; scene.updateMatrixWorld(true);
    expect(city.buildings).toHaveLength(ALL_SPRINGFIELD_PLACES.length);
    expect(city.people.count).toBe(32); expect(city.traffic.count).toBe(25);
    for (const building of city.buildings) {
      expect(building.group.userData.place.key).toBe(building.place.key);
      const origin = building.group.position.clone().add(new THREE.Vector3(0, 90, 0));
      const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(building.group, true).length).toBeGreaterThan(0);
    }
    for (const stage of [1, 2, 3, 4, 5]) { city.setStage(stage); expect(city.buildings.every(b => b.min === 1 && b.group.visible)).toBe(true); }
    const before = city.people.actors.map(a => [a.x, a.z]); city.update(15);
    expect(city.people.actors.some((a, i) => Math.hypot(a.x - before[i]![0]!, a.z - before[i]![1]!) > 1)).toBe(true);
    for (const a of city.people.actors) expect(Number.isFinite(a.x + a.z)).toBe(true);
    let meshes = 0, triangles = 0;
    scene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh) || !(Array.isArray(obj.material) ? obj.material.some(m => m.visible) : obj.material.visible)) return;
      meshes++; triangles += (obj.geometry.index?.count ?? obj.geometry.getAttribute('position').count) / 3 * (obj instanceof THREE.InstancedMesh ? obj.count : 1);
      expect(Number.isFinite(obj.geometry.getAttribute('position').getX(0))).toBe(true);
    });
    console.info(`Springfield: ${SPRINGFIELD_PLACES.length} places + 10 characters; ${meshes} render meshes; ${triangles} triangles`);
    expect(meshes).toBeLessThan(100); expect(triangles).toBeLessThan(500_000);
    city.cancel(); const cancelled = city.people.actors[0]!.x; city.update(60); expect(city.people.actors[0]!.x).toBe(cancelled);
  }, 30000);
  it('walks along streets, pauses at the destination and returns without teleporting', () => {
    const route = streetRoute([-108, 140], [-49, 120]);
    const first = sampleWalk(route, 0, 2), second = sampleWalk(route, .1, 2);
    expect(Math.hypot(first.x - second.x, first.z - second.z)).toBeCloseTo(.2, 4);
    const length = route.slice(1).reduce((n, point, i) => n + Math.hypot(point[0] - route[i]![0], point[1] - route[i]![1]), 0);
    expect(sampleWalk(route, length / 2 + 3, 2).waiting).toBe(true);
    expect(sampleWalk(route, length / 2 + 13, 2).returning).toBe(true);
  });
  it('prepares a real financial action for every location and keeps shopping wallets separate', () => {
    for (const place of ALL_SPRINGFIELD_PLACES) {
      const action = destinationAction(place, 450000); expect(action.label.length).toBeGreaterThan(8);
      if (action.type === 'movement') { expect(action.options.description).toContain(place.name); expect(['income', 'daily', 'fixed', 'save']).toContain(action.kind); }
    }
    const get = (key: string) => destinationAction(ALL_SPRINGFIELD_PLACES.find(place => place.key === key)!, 450000);
    expect(get('plant')).toMatchObject({ type: 'movement', kind: 'income', options: { cents: 450000, source: 'salary' } });
    expect(get('kwik')).toMatchObject({ type: 'movement', kind: 'daily', options: { wallet: 'food' } });
    expect(get('comic')).toMatchObject({ type: 'movement', kind: 'daily', options: { wallet: 'cash' } });
    expect(get('bank')).toMatchObject({ type: 'movement', kind: 'save' });
    expect(get('simpsons')).toMatchObject({ type: 'panel', panel: 'perfil' });
  });
  it('fits the physical city into the desktop overview', () => {
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 1, 2200), radius = 1000;
    const { azimuth, polar } = SPRINGFIELD_VIEW;
    camera.position.set(-35 + radius * Math.sin(polar) * Math.cos(azimuth), 5 + radius * Math.cos(polar), -35 + radius * Math.sin(polar) * Math.sin(azimuth));
    camera.lookAt(-35, 5, -35); camera.updateMatrixWorld();
    for (const place of SPRINGFIELD_PLACES) {
      const p = new THREE.Vector3(place.x, 6, place.z).project(camera);
      expect(Math.abs(p.x)).toBeLessThan(.95); expect(Math.abs(p.y)).toBeLessThan(.95); expect(p.z).toBeLessThan(1);
    }
  });
});
