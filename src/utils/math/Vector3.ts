export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static fromArray(arr: [number, number, number]): Vector3 {
    return new Vector3(arr[0], arr[1], arr[2]);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiplyByScalar(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  divideByScalar(s: number): Vector3 {
    return new Vector3(this.x / s, this.y / s, this.z / s);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) {
      return new Vector3(0, 0, 0);
    }
    return this.divideByScalar(len);
  }

  static normalize(v: Vector3): Vector3 {
    return v.normalize();
  }

  static distance(a: Vector3, b: Vector3): number {
    return a.subtract(b).length();
  }

  static lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return new Vector3(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    );
  }

  static projectOntoVector(v: Vector3, onto: Vector3): Vector3 {
    const normalized = onto.normalize();
    const scalar = v.dot(normalized);
    return normalized.multiplyByScalar(scalar);
  }

  static rejectFromVector(v: Vector3, from: Vector3): Vector3 {
    return v.subtract(Vector3.projectOntoVector(v, from));
  }

  static angleBetween(a: Vector3, b: Vector3): number {
    const denom = Math.sqrt(a.lengthSquared() * b.lengthSquared());
    if (denom === 0) {
      return 0;
    }
    const cosTheta = Math.min(1, Math.max(-1, a.dot(b) / denom));
    return Math.acos(cosTheta);
  }

  static equalsEpsilon(a: Vector3, b: Vector3, epsilon = 1e-8): boolean {
    return (
      Math.abs(a.x - b.x) <= epsilon &&
      Math.abs(a.y - b.y) <= epsilon &&
      Math.abs(a.z - b.z) <= epsilon
    );
  }
}

export function fromArray(array: [number, number, number]): Vector3 {
  return Vector3.fromArray(array);
}

export function toArray(v: Vector3): [number, number, number] {
  return v.toArray();
}
