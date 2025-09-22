import { Orientation, Axis } from './constants.js';
import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { Matrix4 } from '../math/Matrix4.js';

const WORLD_X = new Vector3(1, 0, 0);
const WORLD_Y = new Vector3(0, 1, 0);
const WORLD_Z = new Vector3(0, 0, 1);

function normalizeAxes(axes) {
  const x = axes.x.clone().normalize();
  const y = axes.y.clone().normalize();
  let z = axes.z.clone();
  if (z.length() === 0) {
    z = x.clone().cross(y).normalize();
  } else {
    z.normalize();
  }
  const yOrtho = z.clone().cross(x).normalize();
  const xOrtho = yOrtho.clone().cross(z).normalize();
  return { x: xOrtho, y: yOrtho, z: z.clone().normalize() };
}

function buildMatrix(origin, axes) {
  const m = new Matrix4();
  m.set(
    axes.x.x, axes.y.x, axes.z.x, 0,
    axes.x.y, axes.y.y, axes.z.y, 0,
    axes.x.z, axes.y.z, axes.z.z, 0,
    origin.x, origin.y, origin.z, 1
  );
  return m;
}

function enuAxes(position) {
  const up = position.clone().normalize();
  const lon = Math.atan2(position.y, position.x);
  const hyp = Math.sqrt(position.x * position.x + position.y * position.y);
  const lat = Math.atan2(position.z, hyp);
  const east = new Vector3(-Math.sin(lon), Math.cos(lon), 0).normalize();
  const north = new Vector3(
    -Math.sin(lat) * Math.cos(lon),
    -Math.sin(lat) * Math.sin(lon),
    Math.cos(lat)
  ).normalize();
  return { x: east, y: north, z: up };
}

function viewAxes(camera) {
  const forward = camera.direction.clone().normalize();
  const right = camera.right.clone().normalize();
  const up = camera.up.clone().normalize();
  return { x: right, y: up, z: forward.clone().negate() };
}

function gimbalAxes(targetMatrix) {
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  new Matrix4().copy(targetMatrix).decompose(position, rotation, scale);
  const forward = new Vector3(0, 0, -1).applyQuaternion(rotation);
  const up = new Vector3(0, 1, 0);
  const right = forward.clone().cross(up).normalize();
  const correctedUp = right.clone().cross(forward).normalize();
  return { x: right, y: correctedUp, z: forward.normalize() };
}

function normalAxes(normal, upHint = WORLD_Z) {
  const z = normal.clone().normalize();
  const right = upHint.clone().cross(z);
  if (right.length() < 1e-6) {
    upHint = WORLD_X;
    right.copy(upHint.clone().cross(z));
  }
  right.normalize();
  const up = z.clone().cross(right).normalize();
  return { x: right, y: up, z };
}

export class FrameBuilder {
  constructor(getCamera) {
    this._getCamera = getCamera;
    this._cached = null;
  }

  build(targetMatrix, orientation, options = {}) {
    if (!targetMatrix) {
      throw new Error('targetMatrix is required');
    }
    const { normal } = options;
    const camera = this._getCamera ? this._getCamera() : null;

    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    new Matrix4().copy(targetMatrix).decompose(position, rotation, scale);

    let axes;
    switch (orientation) {
      case Orientation.GLOBAL:
        axes = { x: WORLD_X, y: WORLD_Y, z: WORLD_Z };
        break;
      case Orientation.LOCAL:
        axes = {
          x: new Vector3(1, 0, 0).applyQuaternion(rotation),
          y: new Vector3(0, 1, 0).applyQuaternion(rotation),
          z: new Vector3(0, 0, 1).applyQuaternion(rotation)
        };
        break;
      case Orientation.VIEW:
        if (!camera) {
          throw new Error('Camera is required for view orientation');
        }
        axes = viewAxes(camera);
        break;
      case Orientation.ENU:
        axes = enuAxes(position);
        break;
      case Orientation.NORMAL:
        if (!normal) {
          throw new Error('Normal orientation requires normal option');
        }
        axes = normalAxes(normal, options.upHint || camera?.up || WORLD_Z);
        break;
      case Orientation.GIMBAL:
        axes = gimbalAxes(targetMatrix);
        break;
      default:
        axes = { x: WORLD_X, y: WORLD_Y, z: WORLD_Z };
    }
    const orthogonal = normalizeAxes(axes);
    const matrix = buildMatrix(position, orthogonal);
    this._cached = {
      orientation,
      origin: position,
      axes: orthogonal,
      matrix,
      inverseMatrix: matrix.clone().invert()
    };
    return this._cached;
  }

  getCurrentFrame() {
    return this._cached;
  }

  toWorld(vector) {
    if (!this._cached) throw new Error('Frame not built');
    return vector.clone().applyMatrix4(this._cached.matrix);
  }

  toLocal(vector) {
    if (!this._cached) throw new Error('Frame not built');
    return vector.clone().applyMatrix4(this._cached.inverseMatrix);
  }

  axisVector(axis) {
    if (!this._cached) throw new Error('Frame not built');
    switch (axis) {
      case Axis.X: return this._cached.axes.x.clone();
      case Axis.Y: return this._cached.axes.y.clone();
      case Axis.Z: return this._cached.axes.z.clone();
      default:
        throw new Error(`Unknown axis ${axis}`);
    }
  }
}
