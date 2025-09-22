/**
 * Quaternion helpers for rotation math.
 */
export function quat(x = 0, y = 0, z = 0, w = 1) {
  return { x, y, z, w };
}

export function clone(q) {
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

export function normalize(q) {
  const len = Math.hypot(q.x, q.y, q.z, q.w);
  if (len === 0) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }
  const inv = 1 / len;
  return { x: q.x * inv, y: q.y * inv, z: q.z * inv, w: q.w * inv };
}

export function multiply(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function fromAxisAngle(axis, angle) {
  const half = angle * 0.5;
  const s = Math.sin(half);
  return normalize({
    x: axis.x * s,
    y: axis.y * s,
    z: axis.z * s,
    w: Math.cos(half),
  });
}

export function toMatrix3(q) {
  const x2 = q.x + q.x;
  const y2 = q.y + q.y;
  const z2 = q.z + q.z;
  const xx = q.x * x2;
  const xy = q.x * y2;
  const xz = q.x * z2;
  const yy = q.y * y2;
  const yz = q.y * z2;
  const zz = q.z * z2;
  const wx = q.w * x2;
  const wy = q.w * y2;
  const wz = q.w * z2;

  return [
    1 - (yy + zz),
    xy + wz,
    xz - wy,
    xy - wz,
    1 - (xx + zz),
    yz + wx,
    xz + wy,
    yz - wx,
    1 - (xx + yy),
  ];
}

export function fromMatrix3(m) {
  const trace = m[0] + m[4] + m[8];
  let x, y, z, w;
  if (trace > 0) {
    let s = Math.sqrt(trace + 1.0) * 2;
    w = 0.25 * s;
    x = (m[7] - m[5]) / s;
    y = (m[2] - m[6]) / s;
    z = (m[3] - m[1]) / s;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    let s = Math.sqrt(1.0 + m[0] - m[4] - m[8]) * 2;
    w = (m[7] - m[5]) / s;
    x = 0.25 * s;
    y = (m[1] + m[3]) / s;
    z = (m[2] + m[6]) / s;
  } else if (m[4] > m[8]) {
    let s = Math.sqrt(1.0 + m[4] - m[0] - m[8]) * 2;
    w = (m[2] - m[6]) / s;
    x = (m[1] + m[3]) / s;
    y = 0.25 * s;
    z = (m[5] + m[7]) / s;
  } else {
    let s = Math.sqrt(1.0 + m[8] - m[0] - m[4]) * 2;
    w = (m[3] - m[1]) / s;
    x = (m[2] + m[6]) / s;
    y = (m[5] + m[7]) / s;
    z = 0.25 * s;
  }
  return normalize({ x, y, z, w });
}

export function slerp(a, b, t) {
  let cos = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let bClone = b;
  if (cos < 0) {
    cos = -cos;
    bClone = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
  }
  if (cos > 0.9995) {
    // linear interpolation fallback
    return normalize({
      x: a.x + t * (bClone.x - a.x),
      y: a.y + t * (bClone.y - a.y),
      z: a.z + t * (bClone.z - a.z),
      w: a.w + t * (bClone.w - a.w),
    });
  }
  const theta = Math.acos(cos);
  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;
  return {
    x: a.x * w1 + bClone.x * w2,
    y: a.y * w1 + bClone.y * w2,
    z: a.z * w1 + bClone.z * w2,
    w: a.w * w1 + bClone.w * w2,
  };
}

export function toCesium(q) {
  const Cesium = globalThis.Cesium;
  if (!Cesium) {
    return { x: q.x, y: q.y, z: q.z, w: q.w };
  }
  return new Cesium.Quaternion(q.x, q.y, q.z, q.w);
}

export function fromCesium(q) {
  if (!q) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

export function angleBetween(a, b) {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  return 2 * Math.acos(Math.min(1, Math.max(-1, dot)));
}

export function rotateVector(q, v) {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  const vx = v.x, vy = v.y, vz = v.z;
  const ix = w * vx + y * vz - z * vy;
  const iy = w * vy + z * vx - x * vz;
  const iz = w * vz + x * vy - y * vx;
  const iw = -x * vx - y * vy - z * vz;

  return {
    x: ix * w + iw * -x + iy * -z - iz * -y,
    y: iy * w + iw * -y + iz * -x - ix * -z,
    z: iz * w + iw * -z + ix * -y - iy * -x,
  };
}
