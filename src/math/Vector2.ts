export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static create(x = 0, y = 0): Vector2 {
    return new Vector2(x, y);
  }

  static clone(v: Vector2, result = new Vector2()): Vector2 {
    result.x = v.x;
    result.y = v.y;
    return result;
  }

  static add(a: Vector2, b: Vector2, result = new Vector2()): Vector2 {
    result.x = a.x + b.x;
    result.y = a.y + b.y;
    return result;
  }

  static subtract(a: Vector2, b: Vector2, result = new Vector2()): Vector2 {
    result.x = a.x - b.x;
    result.y = a.y - b.y;
    return result;
  }

  static multiplyByScalar(v: Vector2, scalar: number, result = new Vector2()): Vector2 {
    result.x = v.x * scalar;
    result.y = v.y * scalar;
    return result;
  }

  static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  static magnitude(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static normalize(v: Vector2, result = new Vector2()): Vector2 {
    const mag = Vector2.magnitude(v);
    if (mag === 0) {
      result.x = 0;
      result.y = 0;
      return result;
    }
    return Vector2.multiplyByScalar(v, 1.0 / mag, result);
  }

  static equalsEpsilon(a: Vector2, b: Vector2, epsilon = 1e-8): boolean {
    return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
  }
}
