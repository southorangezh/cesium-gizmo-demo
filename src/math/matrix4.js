import { quat, fromMatrix3 as quatFromMatrix3, toMatrix3 as quatToMatrix3 } from './quaternion.js';
import { vec3, transformMat3 } from './vec3.js';

export function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function clone(m) {
  return [...m];
}

export function multiply(a, b) {
  const out = new Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col + row * 4] =
        a[row * 4] * b[col] +
        a[row * 4 + 1] * b[col + 4] +
        a[row * 4 + 2] * b[col + 8] +
        a[row * 4 + 3] * b[col + 12];
    }
  }
  return out;
}

export function translationMatrix(v) {
  const m = identity();
  m[12] = v.x;
  m[13] = v.y;
  m[14] = v.z;
  return m;
}

export function scalingMatrix(s) {
  return [s.x, 0, 0, 0, 0, s.y, 0, 0, 0, 0, s.z, 0, 0, 0, 0, 1];
}

export function rotationMatrixFromQuaternion(q) {
  const m3 = quatToMatrix3(q);
  return [
    m3[0], m3[1], m3[2], 0,
    m3[3], m3[4], m3[5], 0,
    m3[6], m3[7], m3[8], 0,
    0, 0, 0, 1,
  ];
}

export function composeMatrix(translation, rotation, scale) {
  const t = translationMatrix(translation);
  const r = rotationMatrixFromQuaternion(rotation);
  const s = scalingMatrix(scale);
  return multiply(t, multiply(r, s));
}

export function transformPoint(m, point) {
  return {
    x: m[0] * point.x + m[4] * point.y + m[8] * point.z + m[12],
    y: m[1] * point.x + m[5] * point.y + m[9] * point.z + m[13],
    z: m[2] * point.x + m[6] * point.y + m[10] * point.z + m[14],
  };
}

export function invert(m) {
  const inv = [];
  inv[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] -
    m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] +
    m[13] * m[6] * m[11] -
    m[13] * m[7] * m[10];
  inv[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[11] * m[14] +
    m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] -
    m[12] * m[6] * m[11] +
    m[12] * m[7] * m[10];
  inv[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[11] * m[13] -
    m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] +
    m[12] * m[5] * m[11] -
    m[12] * m[7] * m[9];
  inv[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[10] * m[13] +
    m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] -
    m[12] * m[5] * m[10] +
    m[12] * m[6] * m[9];
  inv[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] -
    m[13] * m[2] * m[11] +
    m[13] * m[3] * m[10];
  inv[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[11] * m[14] -
    m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] +
    m[12] * m[2] * m[11] -
    m[12] * m[3] * m[10];
  inv[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[11] * m[13] +
    m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] -
    m[12] * m[1] * m[11] +
    m[12] * m[3] * m[9];
  inv[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[10] * m[13] -
    m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] +
    m[12] * m[1] * m[10] -
    m[12] * m[2] * m[9];
  inv[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] -
    m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] +
    m[13] * m[2] * m[7] -
    m[13] * m[3] * m[6];
  inv[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[7] * m[14] +
    m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] -
    m[12] * m[2] * m[7] +
    m[12] * m[3] * m[6];
  inv[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[7] * m[13] -
    m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] +
    m[12] * m[1] * m[7] -
    m[12] * m[3] * m[5];
  inv[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[6] * m[13] +
    m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] -
    m[12] * m[1] * m[6] +
    m[12] * m[2] * m[5];
  inv[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] -
    m[9] * m[2] * m[7] +
    m[9] * m[3] * m[6];
  inv[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[7] * m[10] -
    m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] +
    m[8] * m[2] * m[7] -
    m[8] * m[3] * m[6];
  inv[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[7] * m[9] +
    m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] -
    m[8] * m[1] * m[7] +
    m[8] * m[3] * m[5];
  inv[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[6] * m[9] -
    m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] +
    m[8] * m[1] * m[6] -
    m[8] * m[2] * m[5];

  let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

  if (det === 0) {
    return identity();
  }

  det = 1.0 / det;
  for (let i = 0; i < 16; i++) {
    inv[i] *= det;
  }

  return inv;
}

export function decompose(matrix) {
  const translation = vec3(matrix[12], matrix[13], matrix[14]);
  const m3 = [
    matrix[0], matrix[1], matrix[2],
    matrix[4], matrix[5], matrix[6],
    matrix[8], matrix[9], matrix[10],
  ];
  const sx = Math.hypot(m3[0], m3[3], m3[6]);
  const sy = Math.hypot(m3[1], m3[4], m3[7]);
  const sz = Math.hypot(m3[2], m3[5], m3[8]);

  const rotationMatrix = [
    m3[0] / sx, m3[1] / sy, m3[2] / sz,
    m3[3] / sx, m3[4] / sy, m3[5] / sz,
    m3[6] / sx, m3[7] / sy, m3[8] / sz,
  ];

  const rotation = quatFromMatrix3(rotationMatrix);
  const scale = vec3(sx, sy, sz);

  return { translation, rotation, scale };
}

export function recompose(matrix) {
  const { translation, rotation, scale } = decompose(matrix);
  return composeMatrix(translation, rotation, scale);
}

export function applyRotation(matrix, quaternion) {
  const { translation, scale } = decompose(matrix);
  return composeMatrix(translation, quaternion, scale);
}

export function applyTranslation(matrix, delta) {
  const m = clone(matrix);
  m[12] += delta.x;
  m[13] += delta.y;
  m[14] += delta.z;
  return m;
}

export function applyScale(matrix, factor) {
  const { translation, rotation, scale } = decompose(matrix);
  const newScale = vec3(scale.x * factor.x, scale.y * factor.y, scale.z * factor.z);
  return composeMatrix(translation, rotation, newScale);
}

export function basisFromMatrix(matrix) {
  return {
    x: vec3(matrix[0], matrix[1], matrix[2]),
    y: vec3(matrix[4], matrix[5], matrix[6]),
    z: vec3(matrix[8], matrix[9], matrix[10]),
  };
}

export function orthonormalize(matrix) {
  const basis = basisFromMatrix(matrix);
  const x = normalize(basis.x);
  const y = normalize(subtract(basis.y, scale(x, dot(basis.y, x))));
  const z = normalize(subtract(basis.z, add(scale(x, dot(basis.z, x)), scale(y, dot(basis.z, y)))));
  return [
    x.x, x.y, x.z, 0,
    y.x, y.y, y.z, 0,
    z.x, z.y, z.z, 0,
    0, 0, 0, 1,
  ];
}

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (!len) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
