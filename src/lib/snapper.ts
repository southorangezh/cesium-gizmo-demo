import { vec3, Vec3 } from "./math";
import type { Axis, Mode, SnapStepConfig, TransformDelta } from "./types";

export interface SnapRequest {
  mode: Mode;
  axis?: Axis;
  delta: TransformDelta;
  rawDelta: TransformDelta;
  modifiers?: {
    fine?: boolean;
    coarse?: boolean;
  };
}

export class Snapper {
  private config: SnapStepConfig;

  constructor(config?: SnapStepConfig) {
    this.config = config || {};
  }

  setConfig(config?: SnapStepConfig) {
    this.config = config || {};
  }

  apply(request: SnapRequest): { delta: TransformDelta; snapped: boolean } {
    const { mode, axis, delta, rawDelta, modifiers } = request;
    const fineScale = modifiers?.fine ? this.config.fineModifier ?? 0.2 : 1;
    const coarseScale = modifiers?.coarse ? this.config.coarseModifier ?? 5 : 1;
    const totalScale = fineScale * coarseScale;
    let snapped = false;
    if (mode === "translate" && this.config.translate) {
      const step = this.config.translate * totalScale;
      const snappedVec = this.snapVec(delta.translation, step, axis);
      snapped = snapped || !this.vecEquals(snappedVec, delta.translation);
      delta.translation = snappedVec;
    }
    if (mode === "rotate" && this.config.rotate) {
      const step = this.config.rotate * totalScale;
      const angle = this.snapScalar(this.rotationAngle(delta.rotation), step);
      if (angle !== this.rotationAngle(delta.rotation)) {
        snapped = true;
        delta.rotation = rawDelta.rotation;
      }
    }
    if (mode === "scale" && this.config.scale) {
      const step = this.config.scale * totalScale;
      const snappedVec = this.snapVec(delta.scale, step, axis, true);
      snapped = snapped || !this.vecEquals(snappedVec, delta.scale);
      delta.scale = snappedVec;
    }
    return { delta, snapped };
  }

  private rotationAngle(rotation: any): number {
    const w = rotation?.w ?? rotation?.[3] ?? 1;
    return 2 * Math.acos(Math.max(-1, Math.min(1, w)));
  }

  private snapScalar(value: number, step: number): number {
    if (step <= 0) return value;
    return Math.round(value / step) * step;
  }

  private snapVec(vec: any, step: number, axis?: Axis, allowNegative = false): Vec3 {
    if (!vec) return vec3(0, 0, 0);
    const values: Vec3 = [vec.x ?? vec[0] ?? 0, vec.y ?? vec[1] ?? 0, vec.z ?? vec[2] ?? 0];
    if (axis) {
      const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
      const snappedValue = this.snapScalar(values[index], step);
      values[index] = snappedValue;
    } else {
      for (let i = 0; i < 3; i++) {
        values[i] = this.snapScalar(values[i], step);
      }
    }
    if (!allowNegative) {
      for (let i = 0; i < 3; i++) {
        if (values[i] < 0) values[i] = 0;
      }
    }
    return vec3(values[0], values[1], values[2]);
  }

  private vecEquals(a: Vec3, b: any): boolean {
    const valuesB: Vec3 = [b.x ?? b[0] ?? 0, b.y ?? b[1] ?? 0, b.z ?? b[2] ?? 0];
    return Math.abs(a[0] - valuesB[0]) < 1e-5 && Math.abs(a[1] - valuesB[1]) < 1e-5 && Math.abs(a[2] - valuesB[2]) < 1e-5;
  }
}

