import type { VisualQuality } from './valeFinish';
export type QualityMode = 'auto' | VisualQuality;
const order: VisualQuality[] = ['low', 'medium', 'high'];

/** Samples rendered frames, excluding tab switches, loading and warm-up. */
export class DesktopQuality {
  mode: QualityMode = 'auto';
  tier: VisualQuality = 'high';
  fps = 0;
  private started = -1;
  private sum = 0;
  private count = 0;
  private stable = 0;
  setMode(mode: QualityMode) { this.mode = mode; if (mode !== 'auto') this.tier = mode; this.reset(); }
  reset() { this.started = -1; this.sum = 0; this.count = 0; this.stable = 0; }
  sample(now: number, frameMs: number): boolean {
    if (this.started < 0) this.started = now;
    if (frameMs <= 0 || frameMs > 200) return false;
    this.sum += frameMs; this.count++;
    if (now - this.started < 2200) return false;
    this.fps = this.count * 1000 / Math.max(1, this.sum);
    this.started = now; this.sum = 0; this.count = 0;
    if (this.mode !== 'auto') return false;
    const index = order.indexOf(this.tier);
    if (this.fps < 50 && index > 0) { this.tier = order[index - 1]!; this.stable = 0; return true; }
    this.stable = this.fps > 57 ? this.stable + 1 : 0;
    if (this.stable >= 5 && index < 2) { this.tier = order[index + 1]!; this.stable = 0; return true; }
    return false;
  }
  ratio(width: number, height: number, deviceRatio: number) {
    const caps = { high: [1.5, 3_600_000], medium: [1.1, 2_100_000], low: [.85, 1_400_000] } as const;
    const [cap, pixels] = caps[this.tier];
    return Math.min(deviceRatio, cap, Math.sqrt(pixels / Math.max(1, width * height)));
  }
}
