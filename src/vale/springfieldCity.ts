import * as THREE from 'three';
import { springfieldKit } from './springfieldKit';
import { drawSpringfieldBuilding } from './springfieldBuildings';
import { createSpringfieldPeople } from './springfieldPeople';
import { createSpringfieldTraffic } from './springfieldTraffic';
import { createFjordWater } from './fjordWater';
import { SPRINGFIELD_PLACES, SPRINGFIELD_ROADS, type SpringfieldPlace } from './springfieldLocations';

export function springfieldHeightAt(x: number, z: number) {
  if (x > 240) return .1 - (x - 240) * .7;
  const beyond = Math.max(0, -300 - x, -300 - z, z - 232);
  return .12 + Math.min(38, beyond * .43) * (.7 + Math.sin(x * .013 + z * .008) * .2);
}

/** All lots stay available. Personal progress improves the home garden only. */
export function buildSpringfield(scene: THREE.Scene, onProgress?: (loaded: number, total: number) => void) {
  const root = new THREE.Group(); root.name = 'Springfield'; scene.add(root);
  const kit = springfieldKit(), decor = new THREE.Group(); decor.position.y = .18;
  const terrain = new THREE.PlaneGeometry(800, 800, 128, 128); terrain.rotateX(-Math.PI / 2);
  const positions = terrain.getAttribute('position'), colors = new Float32Array(positions.count * 3);
  const green = new THREE.Color('#8fb36b'), rock = new THREE.Color('#a8b78e');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), y = springfieldHeightAt(x, z); positions.setY(i, y);
    const color = green.clone().lerp(rock, THREE.MathUtils.smoothstep(y, 3, 30)); color.multiplyScalar(.98 + Math.sin(x * .07) * Math.cos(z * .05) * .035);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3)); terrain.computeVertexNormals();
  const ground = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94 })); ground.receiveShadow = true; root.add(ground);
  // A continuous orthogonal street network, with complete crossings and sidewalks.
  for (const road of SPRINGFIELD_ROADS) {
    kit.box(decor, 15, .12, 505, '#d9d5bf', road, .08, -35); kit.box(decor, 505, .12, 15, '#d9d5bf', -35, .08, road);
    kit.box(decor, 9.6, .14, 505, '#777e7a', road, .12, -35); kit.box(decor, 505, .14, 9.6, '#777e7a', -35, .12, road);
    for (let d = -274; d < 211; d += 7) {
      if (SPRINGFIELD_ROADS.some(cross => Math.abs(d - cross) < 9)) continue;
      kit.box(decor, .13, .025, 3, '#ede2aa', road, .21, d); kit.box(decor, 3, .025, .13, '#ede2aa', d, .21, road);
    }
    for (let d = -255; d <= 185; d += 70) { kit.lamp(decor, road - 6.3, d); kit.lamp(decor, d, road + 6.3); }
  }
  for (const x of SPRINGFIELD_ROADS) for (const z of SPRINGFIELD_ROADS) {
    kit.box(decor, 10, .03, 10, '#777e7a', x, .23, z);
    for (const side of [-1, 1]) for (let stripe = -3; stripe <= 3; stripe++) {
      kit.box(decor, .55, .025, 2, '#f0ebd2', x + stripe, .25, z + side * 7);
      kit.box(decor, 2, .025, .55, '#f0ebd2', x + side * 7, .25, z + stripe);
    }
    if (Math.abs(x) < 180 && Math.abs(z) < 180) {
      kit.cylinder(decor, .09, .12, 5.7, '#576b65', x - 6.2, 2.9, z + 6.2, 8);
      kit.box(decor, .8, 1.9, .65, '#58665b', x - 6.2, 5.5, z + 6.2, true);
      for (const [i, tint] of ['#d68265', '#dfc77b', '#92b272'].entries()) kit.sphere(decor, tint, x - 6.2, 6.05 - i * .52, z + 6.56, .18);
    }
  }
  onProgress?.(1, 4);
  const ghost = new THREE.MeshBasicMaterial({ visible: false }), pickGeometry = new THREE.BoxGeometry(1, 1, 1);
  const buildings: { id: SpringfieldPlace['panel']; min: number; scale: number; group: THREE.Group; place: SpringfieldPlace }[] = [];
  const anchors: { id: SpringfieldPlace['panel']; name: string; position: [number, number, number]; min: number; place: SpringfieldPlace }[] = [];
  const sources: THREE.Group[] = [decor];
  function proxy(place: SpringfieldPlace, height: number, width = place.width * .95, depth = place.depth * .8) {
    const group = new THREE.Group(); group.position.set(place.x, .23, place.z); group.userData.place = place;
    const shape = new THREE.Mesh(pickGeometry, ghost); shape.userData.pick = true; shape.scale.set(width, height, depth); shape.position.y = height / 2; group.add(shape); root.add(group);
    buildings.push({ id: place.panel, min: 1, scale: 1, group, place }); return group;
  }
  for (const place of SPRINGFIELD_PLACES) {
    const body = new THREE.Group(); body.position.set(place.x, .23, place.z);
    kit.box(body, place.width, .12, place.depth, place.model === 'park' || place.model === 'lake' ? '#8caf70' : '#c7cbb1', 0, .02, 0);
    const height = drawSpringfieldBuilding(kit, place, body); sources.push(body); proxy(place, height);
    // Connect the entrance of every property to the street along its south edge.
    const road = SPRINGFIELD_ROADS.find(r => r > place.z) ?? 210;
    const start = place.z + Math.min(place.depth / 2, 10), end = road - 5;
    if (end > start) kit.box(decor, 2, .04, end - start, '#d9d5bf', place.x, .17, (start + end) / 2);
    if (place.primary) anchors.push({ id: place.panel, name: place.name, position: [place.x, height + 2, place.z], min: 1, place });
  }
  // Street trees, front gardens and a wooded boundary, never a blank green map edge.
  for (let x = -268; x <= 198; x += 35) for (const z of [-292, 222]) kit.tree(decor, x, z, 1.2 + (Math.abs(x) % 3) * .15);
  for (let z = -268; z <= 198; z += 35) for (const x of [-292, 229]) kit.tree(decor, x, z, 1.25);
  for (const place of SPRINGFIELD_PLACES) if (place.width > 30 && !['plant', 'airport', 'stadium'].includes(place.model)) {
    for (const side of [-1, 1]) kit.tree(decor, place.x + side * (place.width / 2 - 2), place.z + place.depth / 2 - 1, .85);
  }
  kit.bake(sources, root); kit.release(); onProgress?.(2, 4);
  const people = createSpringfieldPeople(root), traffic = createSpringfieldTraffic(root);
  const characters = people.actors.filter(actor => actor.hero).map(actor => ({ actor, group: proxy(actor.hero!, 6, 3, 3) }));
  // Coast and harbour water are separate from the lake inside the city.
  const sea = createFjordWater(springfieldHeightAt, 800); sea.mesh.name = 'Springfield ocean'; root.add(sea.mesh);
  const boatKit = springfieldKit(false), boatSource = new THREE.Group();
  boatKit.sphere(boatSource, '#b66e59', 0, .4, 0, 1.5, .7, 4); boatKit.box(boatSource, 2, .3, 5, '#e8d3a8', 0, .8, 0, true);
  boatKit.cylinder(boatSource, .09, .12, 6.5, '#a18c68', 0, 4, 0, 8);
  const sail = boatKit.box(boatSource, .1, 4, 2.3, '#f4e6b8', 0, 4.4, .8); sail.rotation.x = -.2;
  const boatBaked = new THREE.Group(); boatKit.bake([boatSource], boatBaked, false); const boatTemplate = boatBaked.children[0] as THREE.Mesh;
  const boats = [0, 1, 2].map(() => { const boat = new THREE.Mesh(boatTemplate.geometry, boatTemplate.material); root.add(boat); return boat; }); boatKit.release();
  const garden = new THREE.Group(); garden.position.set(-108, .3, 99); root.add(garden);
  const upgradeKit = springfieldKit(false), upgrades = new THREE.Group(); upgradeKit.bench(upgrades, -6, 0); upgradeKit.tree(upgrades, 3, -1, .85); upgradeKit.bake([upgrades], garden); upgradeKit.release();
  onProgress?.(4, 4);
  let cancelled = false, lastTick = -1;
  function update(seconds: number) {
    if (cancelled || Math.floor(seconds * 20) === lastTick) return; lastTick = Math.floor(seconds * 20);
    people.update(seconds); traffic.update(seconds);
    for (const { actor, group } of characters) group.position.set(actor.x, .23, actor.z);
    boats.forEach((boat, index) => { const a = seconds * .018 + index * 2.1; boat.position.set(275 + Math.sin(a) * 10, .25 + Math.sin(seconds * 1.4 + index) * .09, Math.cos(a) * 155); boat.rotation.set(Math.sin(seconds + index) * .025, Math.atan2(Math.cos(a) * 10, -Math.sin(a) * 155), .025); });
    sea.update(seconds);
  }
  update(0);
  return { buildings, anchors, people, traffic, windows: [kit.glow], ready: Promise.resolve(), update, setStage(stage: number) { garden.visible = stage >= 3; }, cancel() { cancelled = true; } };
}
