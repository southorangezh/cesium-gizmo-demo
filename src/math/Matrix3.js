import { Vector3 } from './Vector3.js';

export class Matrix3 {
  constructor() {
    this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  set(
    n11, n12, n13,
    n21, n22, n23,
    n31, n32, n33
  ) {
    const e = this.elements;
    e[0] = n11; e[3] = n12; e[6] = n13;
    e[1] = n21; e[4] = n22; e[7] = n23;
    e[2] = n31; e[5] = n32; e[8] = n33;
    return this;
  }

  identity() {
    this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
    return this;
  }

  copy(m) {
    const e = this.elements;
    const me = m.elements;
    for (let i = 0; i < 9; i++) {
      e[i] = me[i];
    }
    return this;
  }

  clone() {
    const m = new Matrix3();
    return m.copy(this);
  }

  transpose() {
    let tmp;
    const e = this.elements;
    tmp = e[1]; e[1] = e[3]; e[3] = tmp;
    tmp = e[2]; e[2] = e[6]; e[6] = tmp;
    tmp = e[5]; e[5] = e[7]; e[7] = tmp;
    return this;
  }

  multiplyScalar(s) {
    const e = this.elements;
    for (let i = 0; i < 9; i++) {
      e[i] *= s;
    }
    return this;
  }

  determinant() {
    const e = this.elements;
    const a = e[0], b = e[3], c = e[6];
    const d = e[1], f = e[4], g = e[7];
    const h = e[2], i = e[5], j = e[8];
    return a * f * j + b * g * h + c * d * i - c * f * h - b * d * j - a * g * i;
  }

  getNormalMatrix(matrix4) {
    return this.setFromMatrix4(matrix4).invert().transpose();
  }

  setFromMatrix4(m) {
    const me = m.elements;
    return this.set(
      me[0], me[4], me[8],
      me[1], me[5], me[9],
      me[2], me[6], me[10]
    );
  }

  invert() {
    const e = this.elements;
    const a00 = e[0], a01 = e[3], a02 = e[6];
    const a10 = e[1], a11 = e[4], a12 = e[7];
    const a20 = e[2], a21 = e[5], a22 = e[8];

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) {
      return this.identity();
    }

    det = 1.0 / det;

    this.set(
      b01 * det,
      (-a22 * a01 + a02 * a21) * det,
      (a12 * a01 - a02 * a11) * det,
      b11 * det,
      (a22 * a00 - a02 * a20) * det,
      (-a12 * a00 + a02 * a10) * det,
      b21 * det,
      (-a21 * a00 + a01 * a20) * det,
      (a11 * a00 - a01 * a10) * det
    );
    return this;
  }

  applyToVector3Array(array, offset = 0, length = array.length) {
    const v = new Vector3();
    for (let i = offset; i < length; i += 3) {
      v.set(array[i], array[i + 1], array[i + 2]).applyMatrix3(this);
      array[i] = v.x; array[i + 1] = v.y; array[i + 2] = v.z;
    }
    return array;
  }
}
