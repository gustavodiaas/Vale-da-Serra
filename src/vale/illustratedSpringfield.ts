import * as THREE from 'three';
import { ART_WIDTH, ART_HEIGHT, ART_URL, ILLUSTRATED_PLACES, artPoint } from './illustratedLayout';
import { createPeopleArt } from './cartoonPeopleArt';
import { cartoonNight } from './cartoonLook';
import { sampleWalk } from './springfieldPeople';

export function buildIllustratedSpringfield(scene: THREE.Scene, loadTexture = (url: string) => new THREE.TextureLoader().loadAsync(url), onProgress?: (value: number) => void) {
  const root = new THREE.Group(); root.name = 'Illustrated Springfield'; scene.add(root);
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(ART_WIDTH, ART_HEIGHT).rotateX(-Math.PI / 2), material); map.visible = false; root.add(map);
  let cancelled = false;
  const ready = loadTexture(`${import.meta.env.BASE_URL}${ART_URL}`).then(texture => {
    if (cancelled) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
    material.map = texture; material.needsUpdate = true; map.visible = true; onProgress?.(100);
  });
  const ghost = new THREE.MeshBasicMaterial({ visible: false }), rectangle = new THREE.BoxGeometry(1, 1, 1);
  const buildings = ILLUSTRATED_PLACES.map(place => {
    const group = new THREE.Group(); group.position.set(place.x, .03, place.z); group.userData.place = place;
    const mesh = new THREE.Mesh(rectangle, ghost); mesh.scale.set(place.width, place.isCharacter ? .7 : .2, place.depth); group.add(mesh); root.add(group);
    return { group, id: place.panel, place, min: 1, scale: 1 };
  });
  const anchors = buildings.filter(b => ['simpsons', 'kwik', 'krusty', 'moe', 'plant', 'bank', 'school', 'burns', 'lard'].includes(b.place.key)).map(b => ({ id: b.id, name: b.place.name, place: b.place, min: 1, position: [b.place.x, .4, b.place.z - b.place.depth * .45] as [number, number, number] }));
  const art = createPeopleArt();
  const walks: [number, number][][] = [
    [[.314,.429],[.39,.456],[.451,.531],[.529,.551]],
    [[.412,.419],[.485,.369],[.572,.402],[.666,.437]],
    [[.234,.611],[.318,.652],[.41,.612],[.444,.568]],
    [[.546,.775],[.602,.739],[.649,.764],[.716,.831]],
    [[.716,.394],[.77,.35],[.835,.381],[.865,.361]],
  ];
  const actors = Array.from({ length: 32 }, (_, index) => {
    const style = index < 12 ? index : 10 + index % 2, place = ILLUSTRATED_PLACES.filter(p => p.isCharacter)[index];
    const body = new THREE.Sprite(art.materials[style]![0]!); body.material.fog = false; body.center.set(.5, 0); body.scale.set(2.6, 5.2, 1); root.add(body);
    const proxy = place ? buildings.find(b => b.place.key === place.key)! : null;
    return { body, proxy, place, style, x: 0, z: 0, route: walks[index % walks.length]!.map(point => artPoint(point[0], point[1])) };
  });
  const selection = new THREE.Mesh(new THREE.RingGeometry(1, 1.13, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd42a', transparent: true, opacity: .9, depthWrite: false, fog: false }));
  selection.visible = false; selection.position.y = .7; root.add(selection);
  let lastTick = -1, selected: string | null = null;
  function update(seconds: number) {
    if (cancelled || Math.floor(seconds * 20) === lastTick) return; lastTick = Math.floor(seconds * 20);
    actors.forEach((actor, index) => {
      const fixed = actor.place && ['apu', 'krusty-person', 'maggie', 'burns-person', 'ned'].includes(actor.place.key);
      const walk = sampleWalk(actor.route, seconds, index === 2 ? 3 : 1.3, index * 15);
      actor.x = fixed ? actor.place!.x : walk.x; actor.z = fixed ? actor.place!.z : walk.z;
      actor.body.position.set(actor.x, 1, actor.z);
      actor.body.material = art.materials[actor.style]![fixed || walk.waiting ? 0 : Math.floor(seconds * 6 + index) % 4]!;
      actor.body.material.fog = false;
      if (actor.proxy) actor.proxy.group.position.set(actor.x, .5, actor.z);
    });
    if (selected) { const b = buildings.find(b => b.place.key === selected); if (b) selection.position.set(b.group.position.x, .7, b.group.position.z); }
  }
  update(0);
  return {
    buildings, anchors, ready, update,
    setNight(night: boolean) { cartoonNight.value = night ? 1 : 0; material.color.setRGB(night ? .58 : 1, night ? .66 : 1, night ? .81 : 1); },
    select(key: string) { const b = buildings.find(b => b.place.key === key); if (b) { selected = key; selection.visible = true; selection.position.set(b.group.position.x, .7, b.group.position.z); selection.scale.set(b.place.width * .55, 1, b.place.depth * .55); } },
    setStage(_stage: number) { /* Personal milestones remain in the HUD; the approved painting stays intact. */ },
    people: { actors, dispose() { art.materials.flat().forEach(m => m.dispose()); art.texture.dispose(); } },
    cancel() { cancelled = true; },
  };
}
