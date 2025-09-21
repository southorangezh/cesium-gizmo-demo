import { SnapRuntimeOptions, SnapStepConfig } from '../types.js';

const DEFAULT_SNAP: SnapStepConfig = {
  translate: 1.0,
  rotate: (5 * Math.PI) / 180,
  scale: 0.1,
  fineModifier: 0.1,
  coarseModifier: 10
};

export class Snapper {
  private config: SnapStepConfig;

  constructor(config?: SnapStepConfig) {
    this.config = config ?? { ...DEFAULT_SNAP };
  }

  setConfig(config?: SnapStepConfig): void {
    this.config = config ?? { ...DEFAULT_SNAP };
  }

  snapTranslation(value: number, runtime: SnapRuntimeOptions): number {
    return runtime.enabled ? this.snapScalar(value, runtime, this.config.translate) : value;
  }

  snapRotation(value: number, runtime: SnapRuntimeOptions): number {
    return runtime.enabled ? this.snapScalar(value, runtime, this.config.rotate) : value;
  }

  snapScale(value: number, runtime: SnapRuntimeOptions, base = 1): number {
    if (!runtime.enabled) {
      return value;
    }
    const snapped = this.snapScalar(value - base, runtime, this.config.scale);
    return base + snapped;
  }

  private snapScalar(value: number, runtime: SnapRuntimeOptions, step: number): number {
    const effectiveStep = this.getEffectiveStep(step, runtime);
    if (effectiveStep <= 0) {
      return value;
    }
    return Math.round(value / effectiveStep) * effectiveStep;
  }

  private getEffectiveStep(step: number, runtime: SnapRuntimeOptions): number {
    let result = step;
    if (runtime.fineModifierActive) {
      result *= this.config.fineModifier ?? 0.1;
    }
    if (runtime.coarseModifierActive) {
      result *= this.config.coarseModifier ?? 10;
    }
    return result;
  }
}
