import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { advanceTraffic, signalPhase } from './cityTraffic';
import type { CityCar } from './siliconValley';
const car = (position: number, axis: 'x' | 'z' = 'x'): CityCar => ({ mesh: new THREE.Group(), axis, road: 0, direction: 1, position, speed: 6 });
describe('trânsito do Vale', () => {
  it('alterna vias com intervalo de segurança em vermelho', () => {
    expect(signalPhase(0)).toEqual({ axis: 'x', yellow: false });
    expect(signalPhase(11)).toEqual({ axis: 'x', yellow: true });
    expect(signalPhase(13).axis).toBeNull(); expect(signalPhase(14).axis).toBe('z'); expect(signalPhase(27).axis).toBeNull(); expect(signalPhase(28).axis).toBe('x');
  });
  it('para antes da faixa e retoma no verde', () => {
    const cars = [car(-9)]; advanceTraffic(cars, 18, 1); expect(cars[0]!.position).toBe(-8.5);
    advanceTraffic(cars, 0, .5); expect(cars[0]!.position).toBe(-5.5);
  });
  it('deixa o carro que entrou no cruzamento terminar a passagem', () => {
    const cars = [car(-3)]; advanceTraffic(cars, 18, 1); expect(cars[0]!.position).toBe(3);
  });
  it('mantém espaço entre veículos da mesma faixa', () => {
    const cars = [car(-16), car(-9)]; advanceTraffic(cars, 18, 1);
    expect(cars[1]!.position - cars[0]!.position).toBeGreaterThanOrEqual(5.3);
  });
});
