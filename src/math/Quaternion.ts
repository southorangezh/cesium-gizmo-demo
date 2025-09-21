import { Matrix3 } from './Matrix3.js';
import { Vector3 } from './Vector3.js';

export class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  static fromAxisAngle(axis: Vector3, angle: number, result = new Quaternion()): Quaternion {
    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);
    const normalizedAxis = Vector3.normalize(axis, new Vector3());
    result.x = normalizedAxis.x * s;
    result.y = normalizedAxis.y * s;
    result.z = normalizedAxis.z * s;
    result.w = Math.cos(halfAngle);
    return result;
  }

  static fromRotationMatrix(matrix: Matrix3, result = new Quaternion()): Quaternion {
    const m = matrix.elements;
    const trace = m[0] + m[4] + m[8];
    if (trace > 0) {
      const s = Math.sqrt(trace + 1.0) * 2;
      result.w = 0.25 * s;
      result.x = (m[7] - m[5]) / s;
      result.y = (m[2] - m[6]) / s;
      result.z = (m[3] - m[1]) / s;
    } else if (m[0] > m[4] && m[0] > m[8]) {
      const s = Math.sqrt(1.0 + m[0] - m[4] - m[8]) * 2;
      result.w = (m[7] - m[5]) / s;
      result.x = 0.25 * s;
      result.y = (m[1] + m[3]) / s;
      result.z = (m[2] + m[6]) / s;
    } else if (m[4] > m[8]) {
      const s = Math.sqrt(1.0 + m[4] - m[0] - m[8]) * 2;
      result.w = (m[2] - m[6]) / s;
      result.x = (m[1] + m[3]) / s;
      result.y = 0.25 * s;
      result.z = (m[5] + m[7]) / s;
    } else {
      const s = Math.sqrt(1.0 + m[8] - m[0] - m[4]) * 2;
      result.w = (m[3] - m[1]) / s;
      result.x = (m[2] + m[6]) / s;
      result.y = (m[5] + m[7]) / s;
      result.z = 0.25 * s;
    }
    return result.normalize();
  }

  static multiply(a: Quaternion, b: Quaternion, result = new Quaternion()): Quaternion {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w;
    const bx = b.x, by = b.y, bz = b.z, bw = b.w;
    result.x = aw * bx + ax * bw + ay * bz - az * by;
    result.y = aw * by - ax * bz + ay * bw + az * bx;
    result.z = aw * bz + ax * by - ay * bx + az * bw;
    result.w = aw * bw - ax * bx - ay * by - az * bz;
    return result;
  }

  static slerp(a: Quaternion, b: Quaternion, t: number, result = new Quaternion()): Quaternion {
    let cosTheta = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    let bx = b.x;
    let by = b.y;
    let bz = b.z;
    let bw = b.w;

    if (cosTheta < 0) {
      cosTheta = -cosTheta;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }

    if (cosTheta > 0.9995) {
      result.x = a.x + t * (bx - a.x);
      result.y = a.y + t * (by - a.y);
      result.z = a.z + t * (bz - a.z);
      result.w = a.w + t * (bw - a.w);
      return result.normalize();
    }

    const theta0 = Math.acos(cosTheta);
    const sinTheta0 = Math.sqrt(1.0 - cosTheta * cosTheta);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta1 = Math.sin(theta0 - theta);

    const s0 = sinTheta1 / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    result.x = a.x * s0 + bx * s1;
    result.y = a.y * s0 + by * s1;
    result.z = a.z * s0 + bz * s1;
    result.w = a.w * s0 + bw * s1;
    return result;
  }

  normalize(): Quaternion {
    const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (mag === 0) {
      this.x = this.y = this.z = 0;
      this.w = 1;
      return this;
    }
    const invMag = 1.0 / mag;
    this.x *= invMag;
    this.y *= invMag;
    this.z *= invMag;
    this.w *= invMag;
    return this;
  }

  toMatrix3(result = new Matrix3()): Matrix3 {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z;
    const wx = w * x, wy = w * y, wz = w * z;
    result.elements.set([
      1 - 2 * (yy + zz),
      2 * (xy + wz),
      2 * (xz - wy),
      2 * (xy - wz),
      1 - 2 * (xx + zz),
      2 * (yz + wx),
      2 * (xz + wy),
      2 * (yz - wx),
      1 - 2 * (xx + yy)
    ]);
    return result;
  }

  static fromEuler(heading: number, pitch: number, roll: number, result = new Quaternion()): Quaternion {
    const halfHeading = heading * 0.5;
    const halfPitch = pitch * 0.5;
    const halfRoll = roll * 0.5;

    const c1 = Math.cos(halfHeading);
    const s1 = Math.sin(halfHeading);
    const c2 = Math.cos(halfPitch);
    const s2 = Math.sin(halfPitch);
    const c3 = Math.cos(halfRoll);
    const s3 = Math.sin(halfRoll);

    result.w = c1 * c2 * c3 + s1 * s2 * s3;
    result.x = s1 * c2 * c3 - c1 * s2 * s3;
    result.y = c1 * s2 * c3 + s1 * c2 * s3;
    result.z = c1 * c2 * s3 - s1 * s2 * c3;
    return result;
  }

  toEuler(result = new Vector3()): Vector3 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;

    const sinrCosp = 2 * (w * x + y * z);
    const cosrCosp = 1 - 2 * (x * x + y * y);
    result.x = Math.atan2(sinrCosp, cosrCosp);

    const sinp = 2 * (w * y - z * x);
    if (Math.abs(sinp) >= 1) {
      result.y = Math.sign(sinp) * (Math.PI / 2);
    } else {
      result.y = Math.asin(sinp);
    }

    const sinyCosp = 2 * (w * z + x * y);
    const cosyCosp = 1 - 2 * (y * y + z * z);
    result.z = Math.atan2(sinyCosp, cosyCosp);
    return result;
  }
}
