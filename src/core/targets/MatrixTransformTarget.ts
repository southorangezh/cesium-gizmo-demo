import { Matrix4 } from '../../math/Matrix4.js';
import { TransformTarget } from '../../types.js';

let idCounter = 0;

export class MatrixTransformTarget implements TransformTarget {
  readonly id: string;
  private matrix: Matrix4;

  constructor(initialMatrix = Matrix4.identity()) {
    this.id = `target-${idCounter++}`;
    this.matrix = initialMatrix.clone();
  }

  getMatrix(result = new Matrix4()): Matrix4 {
    return this.matrix.clone(result);
  }

  setMatrix(matrix: Matrix4): void {
    this.matrix = matrix.clone(new Matrix4());
  }
}
