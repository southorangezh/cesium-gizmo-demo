import { SnapConfig, SnapResult } from '../types.js';

export interface SnapContext {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  inputStep?: number;
}

export class Snapper {
  apply(value: number, config?: SnapConfig, context: SnapContext = {}): SnapResult {
    if (!config || config.enabled === false) {
      return { value, applied: false, step: 0 };
    }

    let step = config.translate ?? config.rotate ?? config.scale ?? 0;
    if (context.inputStep !== undefined) {
      step = context.inputStep;
    }

    if (context.ctrlKey && config.modifierSteps?.ctrl) {
      step = config.modifierSteps.ctrl;
    }
    if (context.shiftKey && config.modifierSteps?.shift) {
      step = config.modifierSteps.shift;
    }

    if (step <= 0) {
      return { value, applied: false, step: 0 };
    }

    const snapped = Math.round(value / step) * step;
    return { value: snapped, applied: Math.abs(snapped - value) > 1e-8, step };
  }
}
