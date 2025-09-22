import { Vector3 } from './Vector3.js';

export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  clone() {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  copy(q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  setFromAxisAngle(axis, angle) {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);
    return this.normalize();
  }

  setFromRotationMatrix(m) {
    const te = m.elements;
    const m11 = te[0], m12 = te[4], m13 = te[8];
    const m21 = te[1], m22 = te[5], m23 = te[9];
    const m31 = te[2], m32 = te[6], m33 = te[10];
    const trace = m11 + m22 + m33;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      this.w = 0.25 / s;
      this.x = (m32 - m23) * s;
      this.y = (m13 - m31) * s;
      this.z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
      this.w = (m32 - m23) / s;
      this.x = 0.25 * s;
      this.y = (m12 + m21) / s;
      this.z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
      this.w = (m13 - m31) / s;
      this.x = (m12 + m21) / s;
      this.y = 0.25 * s;
      this.z = (m23 + m32) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
      this.w = (m21 - m12) / s;
      this.x = (m13 + m31) / s;
      this.y = (m23 + m32) / s;
      this.z = 0.25 * s;
    }

    return this.normalize();
  }

  setFromUnitVectors(vFrom, vTo) {
    let r = vFrom.dot(vTo) + 1;

    if (r < 1e-6) {
      r = 0;
      if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
        this.set(-vFrom.y, vFrom.x, 0, r);
      } else {
        this.set(0, -vFrom.z, vFrom.y, r);
      }
    } else {
      const cross = vFrom.cross(vTo);
      this.set(cross.x, cross.y, cross.z, r);
    }

    return this.normalize();
  }

  multiply(q) {
    return this.multiplyQuaternions(this, q);
  }

  premultiply(q) {
    return this.multiplyQuaternions(q, this);
  }

  multiplyQuaternions(a, b) {
    const qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
    const qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;

    this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return this;
  }

  rotateTowards(q, step) {
    const angle = this.angleTo(q);
    if (angle === 0) return this;
    const t = Math.min(1, step / angle);
    this.slerp(q, t);
    return this;
  }

  angleTo(q) {
    return 2 * Math.acos(Math.abs(Math.max(-1, Math.min(1, this.dot(q)))));
  }

  dot(q) {
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
  }

  slerp(q, t) {
    if (t === 0) return this;
    if (t === 1) return this.copy(q);
    let cosHalfTheta = this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z;

    if (cosHalfTheta < 0) {
      this.w = -q.w;
      this.x = -q.x;
      this.y = -q.y;
      this.z = -q.z;
      cosHalfTheta = -cosHalfTheta;
    } else {
      this.copy(q);
    }

    if (cosHalfTheta >= 1.0) {
      this.copy(q);
      return this;
    }

    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

    if (sqrSinHalfTheta <= Number.EPSILON) {
      const s = 1 - t;
      this.w = s * this.w + t * q.w;
      this.x = s * this.x + t * q.x;
      this.y = s * this.y + t * q.y;
      this.z = s * this.z + t * q.z;
      return this.normalize();
    }

    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    this.w = this.w * ratioA + q.w * ratioB;
    this.x = this.x * ratioA + q.x * ratioB;
    this.y = this.y * ratioA + q.y * ratioB;
    this.z = this.z * ratioA + q.z * ratioB;

    return this;
  }

  normalize() {
    let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);

    if (l === 0) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    } else {
      l = 1 / l;
      this.x *= l;
      this.y *= l;
      this.z *= l;
      this.w *= l;
    }

    return this;
  }

  invert() {
    return this.conjugate().normalize();
  }

  conjugate() {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    return this;
  }

  applyToVector3(v) {
    return v.applyQuaternion(this);
  }

  toMatrix3(target = null) {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    if (!target) target = { elements: new Array(9) };
    const e = target.elements;
    e[0] = 1 - (yy + zz);
    e[3] = xy - wz;
    e[6] = xz + wy;

    e[1] = xy + wz;
    e[4] = 1 - (xx + zz);
    e[7] = yz - wx;

    e[2] = xz - wy;
    e[5] = yz + wx;
    e[8] = 1 - (xx + yy);
    return target;
  }

  toMatrix4(target = null) {
    if (!target) {
      target = { elements: new Array(16) };
    }
    const e = target.elements;
    const te = this.toMatrix3().elements;
    e[0] = te[0]; e[4] = te[3]; e[8] = te[6]; e[12] = 0;
    e[1] = te[1]; e[5] = te[4]; e[9] = te[7]; e[13] = 0;
    e[2] = te[2]; e[6] = te[5]; e[10] = te[8]; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return target;
  }

  static fromArray(array, offset = 0) {
    return new Quaternion(array[offset], array[offset + 1], array[offset + 2], array[offset + 3]);
  }

  toArray(array = [], offset = 0) {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    array[offset + 3] = this.w;
    return array;
  }

  equals(q, epsilon = 1e-6) {
    return (
      Math.abs(this.x - q.x) <= epsilon &&
      Math.abs(this.y - q.y) <= epsilon &&
      Math.abs(this.z - q.z) <= epsilon &&
      Math.abs(this.w - q.w) <= epsilon
    );
  }

  static identity() {
    return new Quaternion(0, 0, 0, 1);
  }

  static fromVectors(from, to) {
    const vFrom = from.clone().normalize();
    const vTo = to.clone().normalize();
    const q = new Quaternion();
    return q.setFromUnitVectors(vFrom, vTo);
  }
}
