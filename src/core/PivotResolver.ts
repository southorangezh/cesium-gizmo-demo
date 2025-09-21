import { Vector3 } from '../math/Vector3.js';
import { CursorProvider, Pivot, TransformTarget } from '../types.js';

const scratchTranslation = new Vector3();

export class PivotResolver {
  constructor(private readonly cursorProvider?: CursorProvider) {}

  resolveManipulatorPivot(pivot: Pivot, targets: TransformTarget[]): Vector3 {
    if (targets.length === 0) {
      return new Vector3();
    }
    switch (pivot) {
      case 'origin':
        return this.extractTranslation(targets[0]);
      case 'median':
        return this.computeMedian(targets);
      case 'cursor': {
        const cursorPosition = this.cursorProvider?.getCursorPosition();
        return cursorPosition ? Vector3.clone(cursorPosition) : this.computeMedian(targets);
      }
      case 'individual':
        return this.computeMedian(targets);
      default:
        return this.computeMedian(targets);
    }
  }

  resolvePerTargetPivot(pivot: Pivot, targets: TransformTarget[], manipulatorPivot: Vector3): Map<string, Vector3> {
    const map = new Map<string, Vector3>();
    for (const target of targets) {
      switch (pivot) {
        case 'origin':
          map.set(target.id, this.extractTranslation(target));
          break;
        case 'median':
        case 'cursor':
          map.set(target.id, new Vector3(manipulatorPivot.x, manipulatorPivot.y, manipulatorPivot.z));
          break;
        case 'individual':
          map.set(target.id, this.extractTranslation(target));
          break;
        default:
          map.set(target.id, new Vector3(manipulatorPivot.x, manipulatorPivot.y, manipulatorPivot.z));
      }
    }
    return map;
  }

  private extractTranslation(target: TransformTarget): Vector3 {
    const matrix = target.getMatrix();
    return matrix.getTranslation(new Vector3());
  }

  private computeMedian(targets: TransformTarget[]): Vector3 {
    if (targets.length === 0) {
      return new Vector3();
    }
    const sum = new Vector3();
    for (const target of targets) {
      const translation = target.getMatrix().getTranslation(scratchTranslation);
      sum.x += translation.x;
      sum.y += translation.y;
      sum.z += translation.z;
    }
    const inv = 1.0 / targets.length;
    return new Vector3(sum.x * inv, sum.y * inv, sum.z * inv);
  }
}
