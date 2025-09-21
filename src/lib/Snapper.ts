import { Cartesian3, defined, Math as CesiumMath } from 'cesium';
import type { Axis, SnapConfig, SnapContext, SnapProfile, Snapper } from './types';

const DEFAULT_PROFILE: SnapProfile = {
  translationStep: 0.1,
  rotationStep: CesiumMath.toRadians(5),
  scaleStep: 0.05,
  microFactor: 0.1
};

export class UniversalSnapper implements Snapper {
  private translationStep: number;
  private rotationStep: number;
  private scaleStep: number;
  private microFactor: number;
  private context: SnapContext = {};

  constructor(config?: SnapConfig, profile: Partial<SnapProfile> = {}) {
    this.applyConfig(config, profile);
  }

  updateContext(ctx: SnapContext): void {
    this.context = ctx;
  }

  applyConfig(config?: SnapConfig, profile: Partial<SnapProfile> = {}): void {
    const combined: SnapProfile = {
      ...DEFAULT_PROFILE,
      ...profile,
      translationStep: config?.translate ?? profile.translationStep ?? DEFAULT_PROFILE.translationStep,
      rotationStep: config?.rotate ? CesiumMath.toRadians(config.rotate) : (profile.rotationStep ?? DEFAULT_PROFILE.rotationStep),
      scaleStep: config?.scale ?? profile.scaleStep ?? DEFAULT_PROFILE.scaleStep,
      microFactor: profile.microFactor ?? DEFAULT_PROFILE.microFactor
    };
    this.translationStep = combined.translationStep;
    this.rotationStep = combined.rotationStep;
    this.scaleStep = combined.scaleStep;
    this.microFactor = combined.microFactor;
  }

  private resolveStep(base: number): number {
    if (this.context.shiftKey) {
      return base * this.microFactor;
    }
    if (this.context.ctrlKey) {
      return base * 5;
    }
    return base;
  }

  snapTranslation(value: number, axis: Axis): number {
    const step = this.resolveStep(this.translationStep);
    return snap(value, step);
  }

  snapRotation(value: number, axis: Axis | 'view'): number {
    const step = this.resolveStep(this.rotationStep);
    return snap(value, step);
  }

  snapScale(value: number, axis: Axis | 'uniform'): number {
    const step = this.resolveStep(this.scaleStep);
    return 1 + snap(value - 1, step);
  }
}

function snap(value: number, step: number): number {
  if (!defined(step) || step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

export function createDelta(): Cartesian3 {
  return new Cartesian3(0.0, 0.0, 0.0);
}
