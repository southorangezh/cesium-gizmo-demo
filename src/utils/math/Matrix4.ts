import { Quaternion } from './Quaternion.js';
import { Vector3 } from './Vector3.js';

export class Matrix4 {
  constructor(public elements: number[]) {
    if (elements.length !== 16) {
      throw new Error('Matrix4 requires 16 elements');
    }
  }

  static identity(): Matrix4 {
    return new Matrix4([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  static fromTranslationRotationScale(translation: Vector3, rotation: Quaternion, scale: Vector3): Matrix4 {
    const q = rotation.normalize();
    const s = scale;
    const x = q.x;
    const y = q.y;
    const z = q.z;
    const w = q.w;

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    return new Matrix4([
      (1 - (yy + zz)) * s.x, (xy + wz) * s.y, (xz - wy) * s.z, 0,
      (xy - wz) * s.x, (1 - (xx + zz)) * s.y, (yz + wx) * s.z, 0,
      (xz + wy) * s.x, (yz - wx) * s.y, (1 - (xx + yy)) * s.z, 0,
      translation.x, translation.y, translation.z, 1
    ]);
  }

  static fromArray(array: number[]): Matrix4 {
    return new Matrix4([...array]);
  }

  clone(): Matrix4 {
    return new Matrix4([...this.elements]);
  }

  multiply(other: Matrix4): Matrix4 {
    const a = this.elements;
    const b = other.elements;
    const result = new Array<number>(16).fill(0);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let i = 0; i < 4; i++) {
          sum += a[row + i * 4] * b[i + col * 4];
        }
        result[row + col * 4] = sum;
      }
    }

    return new Matrix4(result);
  }

  transformVector(v: Vector3): Vector3 {
    const e = this.elements;
    const x = v.x;
    const y = v.y;
    const z = v.z;
    const tx = e[0] * x + e[4] * y + e[8] * z + e[12];
    const ty = e[1] * x + e[5] * y + e[9] * z + e[13];
    const tz = e[2] * x + e[6] * y + e[10] * z + e[14];
    return new Vector3(tx, ty, tz);
  }

  getTranslation(): Vector3 {
    return new Vector3(this.elements[12], this.elements[13], this.elements[14]);
  }

  getRotation(): Quaternion {
    const e = this.elements;
    const sx = Vector3.fromArray([e[0], e[1], e[2]]).length();
    const sy = Vector3.fromArray([e[4], e[5], e[6]]).length();
    const sz = Vector3.fromArray([e[8], e[9], e[10]]).length();

    const invSx = sx === 0 ? 0 : 1 / sx;
    const invSy = sy === 0 ? 0 : 1 / sy;
    const invSz = sz === 0 ? 0 : 1 / sz;

    const m = [
      e[0] * invSx, e[4] * invSy, e[8] * invSz,
      e[1] * invSx, e[5] * invSy, e[9] * invSz,
      e[2] * invSx, e[6] * invSy, e[10] * invSz
    ];
    return Quaternion.fromMatrix3(m);
  }

  getScale(): Vector3 {
    const e = this.elements;
    return new Vector3(
      Vector3.fromArray([e[0], e[1], e[2]]).length(),
      Vector3.fromArray([e[4], e[5], e[6]]).length(),
      Vector3.fromArray([e[8], e[9], e[10]]).length()
    );
  }

  invert(): Matrix4 {
    const m = this.elements;
    const inv = new Array<number>(16);

    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];

    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];

    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];

    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

    let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

    if (det === 0) {
      throw new Error('Matrix not invertible');
    }

    det = 1 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= det;
    }

    return new Matrix4(inv);
  }

  transpose(): Matrix4 {
    const m = this.elements;
    return new Matrix4([
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    ]);
  }
}

export function matrix4FromArray(array: number[]): Matrix4 {
  return Matrix4.fromArray(array);
}

export function matrix4ToArray(matrix: Matrix4): number[] {
  return [...matrix.elements];
}
