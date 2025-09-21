export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static create(x = 0, y = 0, z = 0): Vector3 {
    return new Vector3(x, y, z);
  }

  static clone(v: Vector3, result = new Vector3()): Vector3 {
    result.x = v.x;
    result.y = v.y;
    result.z = v.z;
    return result;
  }

  static fromArray(array: ArrayLike<number>, offset = 0, result = new Vector3()): Vector3 {
    result.x = array[offset];
    result.y = array[offset + 1];
    result.z = array[offset + 2];
    return result;
  }

  static toArray(v: Vector3, result: number[] = [], offset = 0): number[] {
    result[offset] = v.x;
    result[offset + 1] = v.y;
    result[offset + 2] = v.z;
    return result;
  }

  static add(a: Vector3, b: Vector3, result = new Vector3()): Vector3 {
    result.x = a.x + b.x;
    result.y = a.y + b.y;
    result.z = a.z + b.z;
    return result;
  }

  static subtract(a: Vector3, b: Vector3, result = new Vector3()): Vector3 {
    result.x = a.x - b.x;
    result.y = a.y - b.y;
    result.z = a.z - b.z;
    return result;
  }

  static multiplyByScalar(v: Vector3, scalar: number, result = new Vector3()): Vector3 {
    result.x = v.x * scalar;
    result.y = v.y * scalar;
    result.z = v.z * scalar;
    return result;
  }

  static divideByScalar(v: Vector3, scalar: number, result = new Vector3()): Vector3 {
    return Vector3.multiplyByScalar(v, 1.0 / scalar, result);
  }

  static negate(v: Vector3, result = new Vector3()): Vector3 {
    result.x = -v.x;
    result.y = -v.y;
    result.z = -v.z;
    return result;
  }

  static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static cross(a: Vector3, b: Vector3, result = new Vector3()): Vector3 {
    const ax = a.x;
    const ay = a.y;
    const az = a.z;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;
    result.x = ay * bz - az * by;
    result.y = az * bx - ax * bz;
    result.z = ax * by - ay * bx;
    return result;
  }

  static magnitude(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  static magnitudeSquared(v: Vector3): number {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  }

  static normalize(v: Vector3, result = new Vector3()): Vector3 {
    const mag = Vector3.magnitude(v);
    if (mag === 0) {
      result.x = 0;
      result.y = 0;
      result.z = 0;
      return result;
    }
    return Vector3.divideByScalar(v, mag, result);
  }

  static distance(a: Vector3, b: Vector3): number {
    return Vector3.magnitude(Vector3.subtract(a, b, scratchVector));
  }

  static distanceSquared(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }

  static lerp(a: Vector3, b: Vector3, t: number, result = new Vector3()): Vector3 {
    result.x = a.x + (b.x - a.x) * t;
    result.y = a.y + (b.y - a.y) * t;
    result.z = a.z + (b.z - a.z) * t;
    return result;
  }

  static projectOnVector(vector: Vector3, onto: Vector3, result = new Vector3()): Vector3 {
    const denom = Vector3.dot(onto, onto);
    if (denom === 0) {
      result.x = 0;
      result.y = 0;
      result.z = 0;
      return result;
    }
    const scale = Vector3.dot(vector, onto) / denom;
    return Vector3.multiplyByScalar(onto, scale, result);
  }

  static projectOnPlane(vector: Vector3, planeNormal: Vector3, result = new Vector3()): Vector3 {
    const projection = Vector3.projectOnVector(vector, planeNormal, scratchVector);
    return Vector3.subtract(vector, projection, result);
  }

  static equalsEpsilon(a: Vector3, b: Vector3, epsilon = 1e-10): boolean {
    return (
      Math.abs(a.x - b.x) <= epsilon &&
      Math.abs(a.y - b.y) <= epsilon &&
      Math.abs(a.z - b.z) <= epsilon
    );
  }
}

const scratchVector = new Vector3();
