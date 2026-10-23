import * as THREE from 'three';
import type { cityKit } from './cityLife';

export const VOLLEY_COURTS = [{ x: 105.3, z: -54 }, { x: 105.3, z: 64 }];
export const BEACH_TOWELS = [{ x: 106.5, z: 16 }, { x: 108, z: 34 }, { x: 105.5, z: 83 }, { x: 108, z: 94 }, { x: 106, z: 108 }, { x: 108, z: -82 }];

export function buildActivities(parent: THREE.Group, scene: THREE.Scene, kit: ReturnType<typeof cityKit>) {
  const balls: THREE.Group[] = [];
  for (const court of VOLLEY_COURTS) {
    const { x, z } = court;
    kit.rounded(parent, 8.2, .025, 16.2, 0xe8cc99, x, .06, z, .04);
    for (const side of [-1, 1]) {
      kit.rounded(parent, .07, .025, 16, 0xf7ecce, x + side * 4, .09, z, .02);
      kit.rounded(parent, 8, .025, .07, 0xf7ecce, x, .09, z + side * 8, .02);
      kit.rounded(parent, .12, 2.6, .12, 0xd29c50, x + side * 4.4, 1.3, z, .04);
    }
    for (let y = 1.5; y <= 2.45; y += .15) kit.rounded(parent, 8.8, .025, .025, 0xf3e9d6, x, y, z, .008);
    for (let dx = -4.3; dx < 4.4; dx += .35) kit.rounded(parent, .025, .95, .025, 0xf3e9d6, x + dx, 1.98, z, .008);
    kit.rounded(parent, 8.9, .075, .06, 0xf9f1df, x, 2.5, z, .02);
    const ball = new THREE.Group(); scene.add(ball);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.23, 10, 8), kit.mat(0xf4d69a)); core.castShadow = false; ball.add(core);
    for (const angle of [0, Math.PI / 2]) { const stripe = new THREE.Mesh(new THREE.TorusGeometry(.225, .025, 5, 20), kit.mat(0x4b839b)); stripe.rotation.y = angle; ball.add(stripe); }
    balls.push(ball);
  }
  for (const [i, towel] of BEACH_TOWELS.entries()) {
    kit.rounded(parent, 1, .035, 2.4, i % 2 ? 0x82b4b4 : 0xe2a58a, towel.x, .045, towel.z + .7, .05);
    for (const side of [-1, 1]) kit.rounded(parent, .95, .01, .06, 0xf3e8cc, towel.x, .07, towel.z + .7 + side * .9, .01);
    kit.ball(parent, 0xd8c18a, towel.x + .85, .16, towel.z + 1.5, .32, .1, .32);
  }
  const update = (seconds: number) => {
    balls.forEach((ball, i) => {
      const time = seconds + i * 1.3;
      ball.position.set(VOLLEY_COURTS[i]!.x + Math.sin(time * .6) * 1.5, .95 + Math.abs(Math.sin(time * Math.PI / 2.4)) * 3.7, VOLLEY_COURTS[i]!.z + Math.cos(time * Math.PI / 2.4) * 5.2);
      ball.rotation.set(time * 2, time, 0);
    });
  };
  update(0);
  return { update, courts: VOLLEY_COURTS.length };
}
