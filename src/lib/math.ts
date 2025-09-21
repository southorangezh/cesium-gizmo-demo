import type { Cartesian3Like, QuaternionLike } from "./types";

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export const VEC3_ZERO: Vec3 = [0, 0, 0];
export const QUAT_IDENTITY: Quat = [0, 0, 0, 1];

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function quat(x: number, y: number, z: number, w: number): Quat {
  return [x, y, z, w];
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function vec3Scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vec3Length(a: Vec3): number {
  return Math.sqrt(vec3Dot(a, a));
}

export function vec3Normalize(a: Vec3): Vec3 {
  const len = vec3Length(a);
  if (len === 0) return [0, 0, 0];
  return vec3Scale(a, 1 / len);
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const aw = a[3];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];
  const bw = b[3];
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz
  ];
}

export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const half = angle * 0.5;
  const s = Math.sin(half);
  const n = vec3Normalize(axis);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(half)];
}

export function quatNormalize(q: Quat): Quat {
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function vec3FromLike(value: Cartesian3Like | Vec3 | undefined): Vec3 {
  if (!value) return [0, 0, 0];
  if (Array.isArray(value)) return [value[0], value[1], value[2]];
  return [value.x, value.y, value.z];
}

export function vec3ToLike(value: Vec3): Cartesian3Like {
  return { x: value[0], y: value[1], z: value[2] };
}

export function quatFromLike(value: QuaternionLike | Quat | undefined): Quat {
  if (!value) return [0, 0, 0, 1];
  if (Array.isArray(value)) return [value[0], value[1], value[2], value[3]];
  return [value.x, value.y, value.z, value.w];
}

export function quatToLike(value: Quat): QuaternionLike {
  return { x: value[0], y: value[1], z: value[2], w: value[3] };
}

export function quatToMatrix3(q: Quat): number[][] {
  const [x, y, z, w] = quatNormalize(q);
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
    [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy)],
    [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx)],
    [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)]
  ];
}

export function matrix3MultiplyVec3(m: number[][], v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}

export function quatFromVectors(from: Vec3, to: Vec3): Quat {
  const f = vec3Normalize(from);
  const t = vec3Normalize(to);
  const dot = vec3Dot(f, t);
  if (dot >= 1.0 - 1e-8) {
    return QUAT_IDENTITY;
  }
  if (dot <= -1.0 + 1e-8) {
    const orth = Math.abs(f[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
    const axis = vec3Normalize(vec3Cross(f, orth));
    return quatFromAxisAngle(axis, Math.PI);
  }
  const axis = vec3Cross(f, t);
  const w = Math.sqrt(vec3Dot(f, f) * vec3Dot(t, t)) + dot;
  const q: Quat = [axis[0], axis[1], axis[2], w];
  return quatNormalize(q);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function approxEqual(a: number, b: number, epsilon = 1e-5): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function approxVec3(a: Vec3, b: Vec3, epsilon = 1e-5): boolean {
  return approxEqual(a[0], b[0], epsilon) && approxEqual(a[1], b[1], epsilon) && approxEqual(a[2], b[2], epsilon);
}

export function approxQuat(a: Quat, b: Quat, epsilon = 1e-5): boolean {
  return approxEqual(a[0], b[0], epsilon) && approxEqual(a[1], b[1], epsilon) && approxEqual(a[2], b[2], epsilon) && approxEqual(a[3], b[3], epsilon);
}

