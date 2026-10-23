import * as THREE from 'three';
import { CARTOON_PEOPLE, createPeopleArt } from './cartoonPeopleArt';
import { SPRINGFIELD_CHARACTERS, SPRINGFIELD_ROADS, getPlace } from './springfieldLocations';

export function streetRoute(from: [number, number], to: [number, number]) {
  const nearest = (value: number) => SPRINGFIELD_ROADS.reduce((best, road) => Math.abs(value - road) < Math.abs(value - best) ? road : best);
  const start: [number, number] = [from[0], nearest(from[1]) - 6.1], end: [number, number] = [to[0], nearest(to[1]) - 6.1];
  const road = nearest(from[0]) + 6.1;
  return [start, [road, start[1]], [road, end[1]], end] as [number, number][];
}
export function sampleWalk(route: [number, number][], seconds: number, speed: number, phase = 0) {
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i]![0], p[1] - route[i]![1]));
  const duration = lengths.reduce((a, b) => a + b, 0) / speed;
  const cycle = Math.max(1, duration * 2 + 12), time = (seconds + phase) % cycle;
  const waiting = time > duration && time < duration + 12, returning = time >= duration + 12;
  let distance = (returning ? cycle - time : Math.min(time, duration)) * speed, segment = 0;
  while (segment < lengths.length - 1 && distance > lengths[segment]!) distance -= lengths[segment++]!;
  const a = route[segment]!, b = route[segment + 1]!, t = Math.min(1, distance / Math.max(.001, lengths[segment]!));
  return { x: THREE.MathUtils.lerp(a[0], b[0], t), z: THREE.MathUtils.lerp(a[1], b[1], t), angle: Math.atan2(b[0] - a[0], b[1] - a[1]) + (returning ? Math.PI : 0), waiting, returning };
}

export function createSpringfieldPeople(parent: THREE.Group) {
  const art = createPeopleArt(), scales = [1, 1, .74, .69, .47, .95, 1, 1.02, 1.04, .98, .9, .92];
  const home = getPlace('simpsons')!, count = 32;
  const actors = Array.from({ length: count }, (_, i) => {
    const style = i < 12 ? i : 10 + i % 2, kind = CARTOON_PEOPLE[style]!, hero = SPRINGFIELD_CHARACTERS[i];
    const body = new THREE.Sprite(art.materials[style]![0]!); body.name = hero?.name ?? 'Morador ' + i;
    body.center.set(.5, 0); parent.add(body);
    const target = hero ?? { x: [-175, -105, -35, 35, 105, 175][i % 6]!, z: [-105, -35, 35, 105][i % 4]!, depth: 24 };
    const fixed = ['apu', 'krusty-person', 'maggie', 'burns-person'].includes(kind);
    const route = streetRoute([i < 10 ? home.x : -175 + i % 6 * 70, i < 10 ? 140 : 70], [target.x, target.z + target.depth / 2]);
    return { kind, body, hero, route, style, scale: scales[style]!, fixed, target, x: 0, z: 0 };
  });
  function update(seconds: number) {
    actors.forEach((actor, i) => {
      const pose = sampleWalk(actor.route, seconds, actor.kind === 'bart' ? 4 : 1.5 + i % 3 * .25, i * 22);
      actor.x = actor.fixed ? actor.kind === 'maggie' ? home.x - 8 : actor.target.x - 3 : pose.x;
      actor.z = actor.fixed ? actor.kind === 'maggie' ? home.z + 9 : actor.target.z + actor.target.depth * .5 + 3 : pose.z;
      const frame = actor.fixed || pose.waiting || actor.kind === 'bart' ? 0 : Math.floor(seconds * 6 + i) % 4;
      actor.body.material = art.materials[actor.style]![frame]!;
      actor.body.position.set(actor.x, .23, actor.z);
      actor.body.scale.set(3.2 * actor.scale, 6.4 * actor.scale, 1);
    });
  }
  update(0); return { actors, count, update, dispose() { art.materials.flat().forEach(material => material.dispose()); art.texture.dispose(); } };
}
