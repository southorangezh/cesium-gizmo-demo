import { Matrix3 } from './Matrix3.js';
import { Quaternion } from './Quaternion.js';
import { Vector3 } from './Vector3.js';

export class Matrix4 {
  elements: Float64Array;

  constructor(elements?: Iterable<number>) {
    this.elements = new Float64Array(16);
    if (elements) {
      let i = 0;
      for (const value of elements) {
        this.elements[i++] = value;
      }
    } else {
      this.identity();
    }
  }

  static identity(): Matrix4 {
    return new Matrix4().identity();
  }

  clone(result = new Matrix4()): Matrix4 {
    result.elements.set(this.elements);
    return result;
  }

  identity(): Matrix4 {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
    e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
    e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
    e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
    return this;
  }

  static fromTranslationRotationScale(translation: Vector3, rotation: Quaternion, scale: Vector3, result = new Matrix4()): Matrix4 {
    const rotMatrix = rotation.toMatrix3(new Matrix3());
    const e = result.elements;
    const rm = rotMatrix.elements;
    e[0] = rm[0] * scale.x; e[1] = rm[1] * scale.x; e[2] = rm[2] * scale.x; e[3] = 0;
    e[4] = rm[3] * scale.y; e[5] = rm[4] * scale.y; e[6] = rm[5] * scale.y; e[7] = 0;
    e[8] = rm[6] * scale.z; e[9] = rm[7] * scale.z; e[10] = rm[8] * scale.z; e[11] = 0;
    e[12] = translation.x; e[13] = translation.y; e[14] = translation.z; e[15] = 1;
    return result;
  }

  static fromColumns(x: Vector3, y: Vector3, z: Vector3, w: Vector3, result = new Matrix4()): Matrix4 {
    const e = result.elements;
    e[0] = x.x; e[1] = x.y; e[2] = x.z; e[3] = 0;
    e[4] = y.x; e[5] = y.y; e[6] = y.z; e[7] = 0;
    e[8] = z.x; e[9] = z.y; e[10] = z.z; e[11] = 0;
    e[12] = w.x; e[13] = w.y; e[14] = w.z; e[15] = 1;
    return result;
  }

  multiply(other: Matrix4, result = new Matrix4()): Matrix4 {
    const a = this.elements;
    const b = other.elements;
    const r = result.elements;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const index = col * 4 + row;
        r[index] =
          a[row] * b[col * 4] +
          a[row + 4] * b[col * 4 + 1] +
          a[row + 8] * b[col * 4 + 2] +
          a[row + 12] * b[col * 4 + 3];
      }
    }
    return result;
  }

  transformVector(vector: Vector3, result = new Vector3()): Vector3 {
    const e = this.elements;
    const x = vector.x;
    const y = vector.y;
    const z = vector.z;
    result.x = e[0] * x + e[4] * y + e[8] * z + e[12];
    result.y = e[1] * x + e[5] * y + e[9] * z + e[13];
    result.z = e[2] * x + e[6] * y + e[10] * z + e[14];
    return result;
  }

  transformDirection(direction: Vector3, result = new Vector3()): Vector3 {
    const e = this.elements;
    const x = direction.x;
    const y = direction.y;
    const z = direction.z;
    result.x = e[0] * x + e[4] * y + e[8] * z;
    result.y = e[1] * x + e[5] * y + e[9] * z;
    result.z = e[2] * x + e[6] * y + e[10] * z;
    return result;
  }

  invert(result = new Matrix4()): Matrix4 {
    const e = this.elements;
    const r = result.elements;
    const m00 = e[0], m01 = e[4], m02 = e[8], m03 = e[12];
    const m10 = e[1], m11 = e[5], m12 = e[9], m13 = e[13];
    const m20 = e[2], m21 = e[6], m22 = e[10], m23 = e[14];
    const m30 = e[3], m31 = e[7], m32 = e[11], m33 = e[15];

    const tmp0 = m22 * m33 - m32 * m23;
    const tmp1 = m21 * m33 - m31 * m23;
    const tmp2 = m21 * m32 - m31 * m22;
    const tmp3 = m20 * m33 - m30 * m23;
    const tmp4 = m20 * m32 - m30 * m22;
    const tmp5 = m20 * m31 - m30 * m21;

    const cof00 = m11 * tmp0 - m12 * tmp1 + m13 * tmp2;
    const cof01 = -(m10 * tmp0 - m12 * tmp3 + m13 * tmp4);
    const cof02 = m10 * tmp1 - m11 * tmp3 + m13 * tmp5;
    const cof03 = -(m10 * tmp2 - m11 * tmp4 + m12 * tmp5);

    const det = m00 * cof00 + m01 * cof01 + m02 * cof02 + m03 * cof03;
    if (Math.abs(det) < 1e-12) {
      throw new Error('Matrix4 is singular and cannot be inverted.');
    }

    const invDet = 1.0 / det;

    r[0] = cof00 * invDet;
    r[4] = cof01 * invDet;
    r[8] = cof02 * invDet;
    r[12] = cof03 * invDet;

    r[1] = -(m01 * tmp0 - m02 * tmp1 + m03 * tmp2) * invDet;
    r[5] = (m00 * tmp0 - m02 * tmp3 + m03 * tmp4) * invDet;
    r[9] = -(m00 * tmp1 - m01 * tmp3 + m03 * tmp5) * invDet;
    r[13] = (m00 * tmp2 - m01 * tmp4 + m02 * tmp5) * invDet;

    const tmp6 = m12 * m33 - m32 * m13;
    const tmp7 = m11 * m33 - m31 * m13;
    const tmp8 = m11 * m32 - m31 * m12;
    const tmp9 = m10 * m33 - m30 * m13;
    const tmp10 = m10 * m32 - m30 * m12;
    const tmp11 = m10 * m31 - m30 * m11;

    r[2] = (m01 * tmp6 - m02 * tmp7 + m03 * tmp8) * invDet;
    r[6] = -(m00 * tmp6 - m02 * tmp9 + m03 * tmp10) * invDet;
    r[10] = (m00 * tmp7 - m01 * tmp9 + m03 * tmp11) * invDet;
    r[14] = -(m00 * tmp8 - m01 * tmp10 + m02 * tmp11) * invDet;

    const tmp12 = m12 * m23 - m22 * m13;
    const tmp13 = m11 * m23 - m21 * m13;
    const tmp14 = m11 * m22 - m21 * m12;
    const tmp15 = m10 * m23 - m20 * m13;
    const tmp16 = m10 * m22 - m20 * m12;
    const tmp17 = m10 * m21 - m20 * m11;

    r[3] = -(m01 * tmp12 - m02 * tmp13 + m03 * tmp14) * invDet;
    r[7] = (m00 * tmp12 - m02 * tmp15 + m03 * tmp16) * invDet;
    r[11] = -(m00 * tmp13 - m01 * tmp15 + m03 * tmp17) * invDet;
    r[15] = (m00 * tmp14 - m01 * tmp16 + m02 * tmp17) * invDet;

    return result;
  }

  getTranslation(result = new Vector3()): Vector3 {
    result.x = this.elements[12];
    result.y = this.elements[13];
    result.z = this.elements[14];
    return result;
  }

  getRotation(result = new Matrix3()): Matrix3 {
    const e = this.elements;
    result.elements.set([
      e[0], e[1], e[2],
      e[4], e[5], e[6],
      e[8], e[9], e[10]
    ]);
    return result;
  }

  getScale(result = new Vector3()): Vector3 {
    const e = this.elements;
    result.x = Math.hypot(e[0], e[1], e[2]);
    result.y = Math.hypot(e[4], e[5], e[6]);
    result.z = Math.hypot(e[8], e[9], e[10]);
    return result;
  }
}
