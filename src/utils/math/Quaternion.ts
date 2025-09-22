import { Vector3 } from './Vector3.js';

export class Quaternion {
  constructor(
    public w: number,
    public x: number,
    public y: number,
    public z: number
  ) {}

  static identity(): Quaternion {
    return new Quaternion(1, 0, 0, 0);
  }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const half = angle / 2;
    const s = Math.sin(half);
    const normalized = axis.normalize();
    return new Quaternion(
      Math.cos(half),
      normalized.x * s,
      normalized.y * s,
      normalized.z * s
    );
  }

  static fromEuler(heading: number, pitch: number, roll: number): Quaternion {
    const ch = Math.cos(heading / 2);
    const sh = Math.sin(heading / 2);
    const cp = Math.cos(pitch / 2);
    const sp = Math.sin(pitch / 2);
    const cr = Math.cos(roll / 2);
    const sr = Math.sin(roll / 2);

    return new Quaternion(
      ch * cp * cr + sh * sp * sr,
      sh * cp * cr - ch * sp * sr,
      ch * sp * cr + sh * cp * sr,
      ch * cp * sr - sh * sp * cr
    );
  }

  clone(): Quaternion {
    return new Quaternion(this.w, this.x, this.y, this.z);
  }

  multiply(q: Quaternion): Quaternion {
    const w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
    const x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
    const y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;
    const z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;
    return new Quaternion(w, x, y, z);
  }

  inverse(): Quaternion {
    const normSq =
      this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
    return new Quaternion(this.w / normSq, -this.x / normSq, -this.y / normSq, -this.z / normSq);
  }

  normalize(): Quaternion {
    const length = Math.sqrt(
      this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z
    );
    if (length === 0) {
      return Quaternion.identity();
    }
    return new Quaternion(this.w / length, this.x / length, this.y / length, this.z / length);
  }

  rotateVector(v: Vector3): Vector3 {
    const qVec = new Vector3(this.x, this.y, this.z);
    const uv = qVec.cross(v);
    const uuv = qVec.cross(uv);
    const uvScaled = uv.multiplyByScalar(2 * this.w);
    const uuvScaled = uuv.multiplyByScalar(2);
    return v.add(uvScaled).add(uuvScaled);
  }

  toMatrix3(): number[] {
    const { w, x, y, z } = this.normalize();
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;

    return [
      1 - 2 * (yy + zz),
      2 * (xy - wz),
      2 * (xz + wy),
      2 * (xy + wz),
      1 - 2 * (xx + zz),
      2 * (yz - wx),
      2 * (xz - wy),
      2 * (yz + wx),
      1 - 2 * (xx + yy)
    ];
  }

  static fromMatrix3(m: number[]): Quaternion {
    const m00 = m[0];
    const m11 = m[4];
    const m22 = m[8];
    const trace = m00 + m11 + m22;

    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      const w = 0.25 * s;
      const x = (m[7] - m[5]) / s;
      const y = (m[2] - m[6]) / s;
      const z = (m[3] - m[1]) / s;
      return new Quaternion(w, x, y, z).normalize();
    }

    if (m00 > m11 && m00 > m22) {
      const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      const w = (m[7] - m[5]) / s;
      const x = 0.25 * s;
      const y = (m[1] + m[3]) / s;
      const z = (m[2] + m[6]) / s;
      return new Quaternion(w, x, y, z).normalize();
    }

    if (m11 > m22) {
      const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      const w = (m[2] - m[6]) / s;
      const x = (m[1] + m[3]) / s;
      const y = 0.25 * s;
      const z = (m[5] + m[7]) / s;
      return new Quaternion(w, x, y, z).normalize();
    }

    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    const w = (m[3] - m[1]) / s;
    const x = (m[2] + m[6]) / s;
    const y = (m[5] + m[7]) / s;
    const z = 0.25 * s;
    return new Quaternion(w, x, y, z).normalize();
  }

  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let cosTheta = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
    let end = b;
    if (cosTheta < 0) {
      cosTheta = -cosTheta;
      end = new Quaternion(-b.w, -b.x, -b.y, -b.z);
    }

    if (1 - cosTheta < 1e-6) {
      return new Quaternion(
        a.w + t * (end.w - a.w),
        a.x + t * (end.x - a.x),
        a.y + t * (end.y - a.y),
        a.z + t * (end.z - a.z)
      ).normalize();
    }

    const theta = Math.acos(cosTheta);
    const sinTheta = Math.sin(theta);
    const weightA = Math.sin((1 - t) * theta) / sinTheta;
    const weightB = Math.sin(t * theta) / sinTheta;

    return new Quaternion(
      a.w * weightA + end.w * weightB,
      a.x * weightA + end.x * weightB,
      a.y * weightA + end.y * weightB,
      a.z * weightA + end.z * weightB
    ).normalize();
  }
}

export function quaternionFromArray(arr: [number, number, number, number]): Quaternion {
  return new Quaternion(arr[0], arr[1], arr[2], arr[3]);
}

export function quaternionToArray(q: Quaternion): [number, number, number, number] {
  return [q.w, q.x, q.y, q.z];
}
