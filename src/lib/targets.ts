import { Cartesian3, Matrix3, Matrix4, Quaternion, type Model } from 'cesium';
import type { TransformTarget } from './types';

const scratchTranslation = new Cartesian3();
const scratchMatrix3 = new Matrix3();
const scratchScale = new Cartesian3();
const scratchQuaternion = new Quaternion();

export class ModelTransformTarget implements TransformTarget {
  constructor(private readonly model: Model, public readonly id?: string) {}

  getMatrix(out = new Matrix4()): Matrix4 {
    return Matrix4.clone(this.model.modelMatrix, out);
  }

  setMatrix(matrix: Matrix4): void {
    Matrix4.clone(matrix, this.model.modelMatrix);
  }

  commit(matrix: Matrix4): void {
    this.setMatrix(matrix);
  }
}

export class MatrixTransformTarget implements TransformTarget {
  constructor(private matrix: Matrix4, public readonly id?: string, private readonly onChange?: (matrix: Matrix4) => void) {}

  getMatrix(out = new Matrix4()): Matrix4 {
    return Matrix4.clone(this.matrix, out);
  }

  setMatrix(matrix: Matrix4): void {
    this.matrix = Matrix4.clone(matrix, this.matrix);
    this.onChange?.(this.matrix);
  }

  commit(matrix: Matrix4): void {
    this.setMatrix(matrix);
  }
}

export function decomposeMatrix(matrix: Matrix4): {
  translation: Cartesian3;
  rotation: Quaternion;
  scale: Cartesian3;
} {
  Matrix4.getTranslation(matrix, scratchTranslation);
  Matrix4.getMatrix3(matrix, scratchMatrix3);
  const scale = Matrix3.getScale(scratchMatrix3, scratchScale);
  const rotationMatrix = Matrix3.clone(scratchMatrix3, new Matrix3());
  const rotation = Quaternion.fromRotationMatrix(rotationMatrix, scratchQuaternion);
  return {
    translation: Cartesian3.clone(scratchTranslation),
    rotation: Quaternion.clone(rotation),
    scale: Cartesian3.clone(scale)
  };
}
