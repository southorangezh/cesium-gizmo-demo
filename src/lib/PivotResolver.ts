import { Cartesian3, Matrix4 } from 'cesium';
import type { Pivot, PivotResult, TransformTarget } from './types';

const scratchMatrix = new Matrix4();
const scratchTranslation = new Cartesian3();

export interface PivotOptions {
  pivot: Pivot;
  targets: TransformTarget[];
  cursor?: Cartesian3;
}

export class PivotResolver {
  resolve(options: PivotOptions): PivotResult {
    switch (options.pivot) {
      case 'median':
        return this.resolveMedian(options.targets);
      case 'cursor':
        return this.resolveCursor(options);
      case 'individual':
        return this.resolveIndividual(options.targets);
      case 'origin':
      default:
        return this.resolveOrigin(options.targets);
    }
  }

  private resolveOrigin(targets: TransformTarget[]): PivotResult {
    if (targets.length === 0) {
      return { origin: new Cartesian3(), targets };
    }
    const matrix = targets[0].getMatrix(scratchMatrix);
    const translation = Matrix4.getTranslation(matrix, scratchTranslation);
    return { origin: Cartesian3.clone(translation), targets };
  }

  private resolveMedian(targets: TransformTarget[]): PivotResult {
    if (targets.length === 0) {
      return { origin: new Cartesian3(), targets };
    }
    const accumulator = new Cartesian3();
    for (const target of targets) {
      const matrix = target.getMatrix(scratchMatrix);
      Cartesian3.add(accumulator, Matrix4.getTranslation(matrix, scratchTranslation), accumulator);
    }
    Cartesian3.divideByScalar(accumulator, targets.length, accumulator);
    return { origin: accumulator, targets };
  }

  private resolveCursor(options: PivotOptions): PivotResult {
    const origin = options.cursor ? Cartesian3.clone(options.cursor) : new Cartesian3();
    return { origin, targets: options.targets };
  }

  private resolveIndividual(targets: TransformTarget[]): PivotResult {
    if (targets.length <= 1) {
      return this.resolveOrigin(targets);
    }
    return { origin: this.resolveMedian(targets).origin, targets };
  }
}
