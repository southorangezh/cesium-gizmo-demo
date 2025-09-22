export class Vector3 {
  constructor(public x = 0, public y = 0, public z = 0) {}

  static fromArray(array: readonly number[], offset = 0): Vector3 {
    return new Vector3(array[offset], array[offset + 1], array[offset + 2]);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  set(x: number, y: number, z: number): Vector3 {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3): Vector3 {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v: Vector3): Vector3 {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  addScaledVector(v: Vector3, scale: number): Vector3 {
    this.x += v.x * scale;
    this.y += v.y * scale;
    this.z += v.z * scale;
    return this;
  }

  subtract(v: Vector3): Vector3 {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(scale: number): Vector3 {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    return this;
  }

  divideScalar(scale: number): Vector3 {
    if (scale === 0) {
      throw new Error('Division by zero in Vector3.divideScalar');
    }
    return this.multiplyScalar(1 / scale);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len < 1e-12) {
      return this.set(0, 0, 0);
    }
    return this.divideScalar(len);
  }

  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  applyMatrix3(m: readonly number[]): Vector3 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    this.x = m[0] * x + m[3] * y + m[6] * z;
    this.y = m[1] * x + m[4] * y + m[7] * z;
    this.z = m[2] * x + m[5] * y + m[8] * z;
    return this;
  }

  applyMatrix4(m: readonly number[]): Vector3 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    const invW = w !== 0 ? 1 / w : 1;
    this.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
    this.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
    this.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
    return this;
  }

  projectOnVector(vector: Vector3): Vector3 {
    const denominator = vector.lengthSquared();
    if (denominator === 0) {
      return this.set(0, 0, 0);
    }
    const scalar = this.dot(vector) / denominator;
    return this.copy(vector).multiplyScalar(scalar);
  }

  projectOnPlane(normal: Vector3): Vector3 {
    const projection = this.clone().projectOnVector(normal);
    return this.subtract(projection);
  }

  angleTo(v: Vector3): number {
    const denom = Math.sqrt(this.lengthSquared() * v.lengthSquared());
    if (denom === 0) {
      return 0;
    }
    let theta = this.dot(v) / denom;
    theta = Math.min(Math.max(theta, -1), 1);
    return Math.acos(theta);
  }

  equals(v: Vector3, epsilon = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) <= epsilon &&
      Math.abs(this.y - v.y) <= epsilon &&
      Math.abs(this.z - v.z) <= epsilon
    );
  }

  toArray(out: number[] = [], offset = 0): number[] {
    out[offset] = this.x;
    out[offset + 1] = this.y;
    out[offset + 2] = this.z;
    return out;
  }
}
