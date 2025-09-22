import { Pivot, PivotResult, TargetLike } from './types.js';
import { Matrix4 } from '../utils/math/Matrix4.js';
import { Quaternion } from '../utils/math/Quaternion.js';
import { Vector3 } from '../utils/math/Vector3.js';

function extractPosition(target: TargetLike): Vector3 {
  if (target.matrix) {
    return Matrix4.fromArray(target.matrix).getTranslation();
  }
  if (target.position) {
    return Vector3.fromArray(target.position);
  }
  return Vector3.zero();
}

function buildMatrix(target: TargetLike): Matrix4 {
  if (target.matrix) {
    return Matrix4.fromArray(target.matrix);
  }
  const position = target.position
    ? Vector3.fromArray(target.position)
    : Vector3.zero();
  const rotation = target.rotation
    ? new Quaternion(target.rotation[0], target.rotation[1], target.rotation[2], target.rotation[3])
    : Quaternion.identity();
  const scale = target.scale
    ? Vector3.fromArray(target.scale)
    : new Vector3(1, 1, 1);
  return Matrix4.fromTranslationRotationScale(position, rotation, scale);
}

export class PivotResolver {
  constructor(private cursor?: { position: Vector3 }) {}

  resolve(pivot: Pivot, targets: TargetLike[]): PivotResult {
    if (targets.length === 0) {
      return { pivot: [0, 0, 0] };
    }

    switch (pivot) {
      case 'origin':
        return { pivot: extractPosition(targets[0]).toArray() };
      case 'median':
        return this.resolveMedian(targets);
      case 'cursor':
        return this.resolveCursor();
      case 'individual':
        return this.resolveIndividual(targets);
      default:
        return { pivot: extractPosition(targets[0]).toArray() };
    }
  }

  private resolveMedian(targets: TargetLike[]): PivotResult {
    const sum = targets.reduce((acc, target) => acc.add(extractPosition(target)), Vector3.zero());
    const center = sum.divideByScalar(targets.length);
    return { pivot: center.toArray() };
  }

  private resolveCursor(): PivotResult {
    if (this.cursor) {
      return { pivot: this.cursor.position.toArray() };
    }
    return { pivot: [0, 0, 0] };
  }

  private resolveIndividual(targets: TargetLike[]): PivotResult {
    const entries = targets.map((target) => ({
      target,
      pivot: extractPosition(target).toArray() as [number, number, number]
    }));
    return {
      pivot: entries[0].pivot,
      perTarget: entries
    };
  }

  static applyDelta(target: TargetLike, delta: { translation: Vector3; rotation: Quaternion; scale: Vector3 }): TargetLike {
    const matrix = buildMatrix(target);
    const translation = matrix.getTranslation().add(delta.translation);
    const rotation = matrix.getRotation().multiply(delta.rotation).normalize();
    const scale = new Vector3(
      matrix.getScale().x * delta.scale.x,
      matrix.getScale().y * delta.scale.y,
      matrix.getScale().z * delta.scale.z
    );

    return {
      ...target,
      position: translation.toArray(),
      rotation: [rotation.w, rotation.x, rotation.y, rotation.z],
      scale: scale.toArray(),
      matrix: Matrix4.fromTranslationRotationScale(translation, rotation, scale).elements
    };
  }
}
