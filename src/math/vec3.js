/**
 * Basic 3D vector utilities implemented as immutable helpers.
 * A vector is represented as a plain object { x, y, z } to keep interop with Cesium Cartesian3.
 */
export function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function clone(v) {
  return { x: v.x, y: v.y, z: v.z };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v) {
  const len = length(v);
  if (len === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return scale(v, 1 / len);
}

export function distance(a, b) {
  return length(subtract(a, b));
}

export function projectOnVector(v, axis) {
  const axisNorm = normalize(axis);
  const scalar = dot(v, axisNorm);
  return scale(axisNorm, scalar);
}

export function projectScalarOnVector(v, axis) {
  const axisNorm = normalize(axis);
  return dot(v, axisNorm);
}

export function projectOnPlane(v, planeNormal) {
  const n = normalize(planeNormal);
  const scalar = dot(v, n);
  return subtract(v, scale(n, scalar));
}

export function lerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function equals(a, b, epsilon = 1e-6) {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.z - b.z) <= epsilon
  );
}

export function toCesium(v) {
  const Cesium = globalThis.Cesium;
  if (!Cesium) {
    return { x: v.x, y: v.y, z: v.z };
  }
  return new Cesium.Cartesian3(v.x, v.y, v.z);
}

export function fromCesium(cartesian) {
  if (!cartesian) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: cartesian.x, y: cartesian.y, z: cartesian.z };
}

export function transformMat3(v, m) {
  return {
    x: v.x * m[0] + v.y * m[3] + v.z * m[6],
    y: v.x * m[1] + v.y * m[4] + v.z * m[7],
    z: v.x * m[2] + v.y * m[5] + v.z * m[8],
  };
}

export function transformMat4(v, m) {
  return {
    x: v.x * m[0] + v.y * m[4] + v.z * m[8] + m[12],
    y: v.x * m[1] + v.y * m[5] + v.z * m[9] + m[13],
    z: v.x * m[2] + v.y * m[6] + v.z * m[10] + m[14],
  };
}

export function almostZero(v, epsilon = 1e-6) {
  return Math.abs(v.x) < epsilon && Math.abs(v.y) < epsilon && Math.abs(v.z) < epsilon;
}
