import { Cartesian3, Matrix4 } from 'cesium';
import type { Pivot, TargetLike } from './types';
import { averagePositions } from './TargetAdapters';

export interface PivotContext {
  pivot: Cartesian3;
  individual: boolean;
}

export class PivotResolver {
  private cursor: Cartesian3 | null = null;

  setCursor(position: Cartesian3 | null): void {
    this.cursor = position ? Cartesian3.clone(position, new Cartesian3()) : null;
  }

  resolve(targets: TargetLike[], pivot: Pivot): PivotContext {
    switch (pivot) {
      case 'origin':
        return { pivot: this.firstTargetPosition(targets), individual: false };
      case 'median':
        return { pivot: averagePositions(targets.map((t) => t.getPosition())), individual: false };
      case 'cursor':
        return { pivot: this.cursor ? Cartesian3.clone(this.cursor, new Cartesian3()) : this.firstTargetPosition(targets), individual: false };
      case 'individual':
        return { pivot: this.firstTargetPosition(targets), individual: true };
      default:
        return { pivot: this.firstTargetPosition(targets), individual: false };
    }
  }

  private firstTargetPosition(targets: TargetLike[]): Cartesian3 {
    return Cartesian3.clone(targets[0]?.getPosition() ?? Cartesian3.ZERO, new Cartesian3());
  }
}
