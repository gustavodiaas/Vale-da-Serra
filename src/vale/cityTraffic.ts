import * as THREE from 'three';
import type { cityKit } from './cityLife';
import type { CityCar } from './siliconValley';

export function signalPhase(seconds: number): { axis: 'x' | 'z' | null; yellow: boolean } {
  const t = ((seconds % 28) + 28) % 28;
  if (t < 12) return { axis: 'x', yellow: t >= 10 };
  if (t < 14) return { axis: null, yellow: false };
  if (t < 26) return { axis: 'z', yellow: t >= 24 };
  return { axis: null, yellow: false };
}
export function advanceTraffic(cars: CityCar[], seconds: number, dt: number) {
  const phase = signalPhase(seconds);
  const nextPositions = cars.map(car => {
    let step = Math.max(0, dt) * car.speed;
    if ([-40, 0, 40].includes(car.road) && (phase.axis !== car.axis || phase.yellow)) {
      for (const junction of [-40, 0, 40]) {
        const distance = (junction - car.position) * car.direction;
        // Vehicles already in a crossing finish clearing it before stopping.
        if (distance >= 8.5) step = Math.min(step, Math.max(0, distance - 8.5));
      }
    }
    for (const other of cars) {
      if (other === car || other.axis !== car.axis || other.road !== car.road || other.direction !== car.direction) continue;
      const gap = ((other.position - car.position) * car.direction + 176) % 176;
      step = Math.min(step, Math.max(0, gap - 5.3));
    }
    return ((car.position + 88 + car.direction * step + 176) % 176) - 88;
  });
  cars.forEach((car, i) => { car.position = nextPositions[i]!; });
}
export function createSignals(parent: THREE.Group, kit: ReturnType<typeof cityKit>) {
  const lamps = { x: [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x182523, emissiveIntensity: 0 })), z: [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x182523, emissiveIntensity: 0 })) };
  for (const material of [...lamps.x, ...lamps.z]) material.userData.keepSeparate = true;
  const lens = new THREE.SphereGeometry(.12, 10, 8);
  const pole = new THREE.CylinderGeometry(.06, .095, 4.5, 10);
  for (const x of [-40, 0, 40]) for (const z of [-40, 0, 40]) for (const axis of ['x', 'z'] as const) for (const direction of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(x + (axis === 'x' ? -direction * 4.3 : direction * 4.3), 0, z + (axis === 'z' ? -direction * 4.3 : -direction * 4.3));
    g.rotation.y = axis === 'x' ? -direction * Math.PI / 2 : direction > 0 ? Math.PI : 0;
    parent.add(g);
    const post = new THREE.Mesh(pole, kit.mat(0x3d5158)); post.position.y = 2.25; post.castShadow = true; g.add(post);
    kit.rounded(g, .48, 1.35, .4, 0x34464b, 0, 4.25, 0, .14);
    for (let light = 0; light < 3; light++) {
      kit.rounded(g, .36, .08, .4, 0x34464b, 0, 4.8 - light * .39, .21, .025);
      const bulb = new THREE.Mesh(lens, lamps[axis][light]); bulb.position.set(0, 4.65 - light * .39, .23); bulb.scale.z = .4; g.add(bulb);
    }
  }
  function update(seconds: number) {
    const phase = signalPhase(seconds);
    for (const axis of ['x', 'z'] as const) for (let i = 0; i < 3; i++) {
      const on = phase.axis !== axis ? i === 0 : phase.yellow ? i === 1 : i === 2;
      const color = [0xe45e4d, 0xf2bd55, 0x73c994][i]!;
      lamps[axis][i]!.color.set(on ? color : 0x24332f);
      lamps[axis][i]!.emissive.set(on ? color : 0x000000);
      lamps[axis][i]!.emissiveIntensity = on ? 1.4 : 0;
    }
  }
  update(0);
  return { update };
}
