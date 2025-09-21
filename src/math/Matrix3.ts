import { Vector3 } from './Vector3.js';

export class Matrix3 {
  elements: Float64Array;

  constructor(elements?: Iterable<number>) {
    this.elements = new Float64Array(9);
    if (elements) {
      let i = 0;
      for (const value of elements) {
        this.elements[i++] = value;
      }
    } else {
      this.identity();
    }
  }

  static identity(): Matrix3 {
    return new Matrix3().identity();
  }

  clone(result = new Matrix3()): Matrix3 {
    result.elements.set(this.elements);
    return result;
  }

  identity(): Matrix3 {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0;
    e[3] = 0; e[4] = 1; e[5] = 0;
    e[6] = 0; e[7] = 0; e[8] = 1;
    return this;
  }

  setFromColumns(x: Vector3, y: Vector3, z: Vector3): Matrix3 {
    const e = this.elements;
    e[0] = x.x; e[1] = x.y; e[2] = x.z;
    e[3] = y.x; e[4] = y.y; e[5] = y.z;
    e[6] = z.x; e[7] = z.y; e[8] = z.z;
    return this;
  }

  multiplyVector(vector: Vector3, result = new Vector3()): Vector3 {
    const e = this.elements;
    const x = vector.x;
    const y = vector.y;
    const z = vector.z;
    result.x = e[0] * x + e[3] * y + e[6] * z;
    result.y = e[1] * x + e[4] * y + e[7] * z;
    result.z = e[2] * x + e[5] * y + e[8] * z;
    return result;
  }

  transpose(result = new Matrix3()): Matrix3 {
    const e = this.elements;
    result.elements.set([
      e[0], e[3], e[6],
      e[1], e[4], e[7],
      e[2], e[5], e[8]
    ]);
    return result;
  }

  multiply(other: Matrix3, result = new Matrix3()): Matrix3 {
    const a = this.elements;
    const b = other.elements;
    const r = result.elements;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = col * 3 + row;
        r[index] = a[row] * b[col * 3] + a[row + 3] * b[col * 3 + 1] + a[row + 6] * b[col * 3 + 2];
      }
    }
    return result;
  }

  determinant(): number {
    const e = this.elements;
    return (
      e[0] * (e[4] * e[8] - e[7] * e[5]) -
      e[3] * (e[1] * e[8] - e[7] * e[2]) +
      e[6] * (e[1] * e[5] - e[4] * e[2])
    );
  }

  invert(result = new Matrix3()): Matrix3 {
    const det = this.determinant();
    if (Math.abs(det) < 1e-12) {
      throw new Error('Matrix3 is singular and cannot be inverted.');
    }
    const invDet = 1.0 / det;
    const e = this.elements;
    const r = result.elements;
    r[0] = (e[4] * e[8] - e[7] * e[5]) * invDet;
    r[1] = (e[7] * e[2] - e[1] * e[8]) * invDet;
    r[2] = (e[1] * e[5] - e[4] * e[2]) * invDet;
    r[3] = (e[6] * e[5] - e[3] * e[8]) * invDet;
    r[4] = (e[0] * e[8] - e[6] * e[2]) * invDet;
    r[5] = (e[3] * e[2] - e[0] * e[5]) * invDet;
    r[6] = (e[3] * e[7] - e[6] * e[4]) * invDet;
    r[7] = (e[6] * e[1] - e[0] * e[7]) * invDet;
    r[8] = (e[0] * e[4] - e[3] * e[1]) * invDet;
    return result;
  }
}
