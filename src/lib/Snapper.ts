import { Cartesian3, Quaternion } from 'cesium';
import type { SnapStepConfig } from './types';

export interface SnapState {
  enabled: boolean;
  fine: boolean;
  coarse: boolean;
}

const DEFAULT_STEPS: SnapStepConfig = {
  translation: 0.25,
  rotation: (5 * Math.PI) / 180,
  scale: 0.05,
};

export class Snapper {
  private steps: SnapStepConfig = { ...DEFAULT_STEPS };

  setStepConfig(config?: Partial<SnapStepConfig>): void {
    this.steps = { ...DEFAULT_STEPS, ...config };
  }

  applyTranslation(delta: Cartesian3, state: SnapState): Cartesian3 {
    if (!state.enabled) {
      return delta;
    }
    const step = this.computeStep(this.steps.translation, state);
    return new Cartesian3(
      this.snapValue(delta.x, step),
      this.snapValue(delta.y, step),
      this.snapValue(delta.z, step),
    );
  }

  applyRotation(delta: Quaternion, state: SnapState): Quaternion {
    if (!state.enabled) {
      return delta;
    }
    const step = this.computeStep(this.steps.rotation, state);
    const axisAngle = this.quaternionToAxisAngle(delta);
    const snappedAngle = this.snapValue(axisAngle.angle, step);
    return Quaternion.fromAxisAngle(axisAngle.axis, snappedAngle, new Quaternion());
  }

  applyScale(delta: Cartesian3, state: SnapState): Cartesian3 {
    if (!state.enabled) {
      return delta;
    }
    const step = this.computeStep(this.steps.scale, state);
    return new Cartesian3(
      this.snapValue(delta.x, step),
      this.snapValue(delta.y, step),
      this.snapValue(delta.z, step),
    );
  }

  private quaternionToAxisAngle(q: Quaternion): { axis: Cartesian3; angle: number } {
    const axis = new Cartesian3();
    const angle = Quaternion.computeAngle(q);
    Quaternion.computeAxis(q, axis);
    return { axis, angle };
  }

  private snapValue(value: number, step: number): number {
    if (step <= 0) {
      return value;
    }
    return Math.round(value / step) * step;
  }

  private computeStep(base: number, state: SnapState): number {
    if (state.coarse) {
      return base * 5;
    }
    if (state.fine) {
      return base / 5;
    }
    return base;
  }
}
