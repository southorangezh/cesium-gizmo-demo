import { SnapConfig } from './types';

export interface SnapContext {
  config: SnapConfig;
  useFine: boolean;
}

export class Snapper {
  constructor(private config: SnapConfig = {}) {}

  updateConfig(config: SnapConfig): void {
    this.config = { ...this.config, ...config };
  }

  snapTranslation(value: number, useFine = false): number {
    const step = this.config.translateStep || 0;
    if (step <= 0) return value;
    const factor = useFine ? this.config.fineTranslateFactor || 0.1 : 1;
    const effective = step * factor;
    return Math.round(value / effective) * effective;
  }

  snapRotation(value: number, useFine = false): number {
    const step = this.config.rotateStep || 0;
    if (step <= 0) return value;
    const factor = useFine ? this.config.fineRotateFactor || 0.1 : 1;
    const effective = step * factor;
    return Math.round(value / effective) * effective;
  }

  snapScale(value: number, useFine = false): number {
    const step = this.config.scaleStep || 0;
    if (step <= 0) return value;
    const factor = useFine ? this.config.fineScaleFactor || 0.1 : 1;
    const effective = step * factor;
    return Math.round(value / effective) * effective;
  }
}
