import { Matrix4 } from '../math/Matrix4.js';
import { Vector3 } from '../math/Vector3.js';

export interface CameraState {
  position: Vector3;
  direction: Vector3;
  up: Vector3;
  right: Vector3;
  fov: number;
  aspect: number;
  near: number;
  far: number;
  viewportWidth: number;
  viewportHeight: number;
  viewMatrix: Matrix4;
  projectionMatrix: Matrix4;
  viewProjectionMatrix: Matrix4;
}

export interface PerspectiveCameraOptions {
  position: Vector3;
  lookAt: Vector3;
  up?: Vector3;
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export function createPerspectiveCamera(options: PerspectiveCameraOptions): CameraState {
  const {
    position,
    lookAt,
    up = new Vector3(0, 0, 1),
    fov = (45 * Math.PI) / 180,
    aspect = 1,
    near = 0.1,
    far = 10000,
    viewportWidth = 800,
    viewportHeight = 600
  } = options;

  const direction = Vector3.normalize(Vector3.subtract(lookAt, position, new Vector3()));
  const right = Vector3.normalize(Vector3.cross(direction, up, new Vector3()));
  const correctedUp = Vector3.normalize(Vector3.cross(right, direction, new Vector3()));

  const viewMatrix = buildViewMatrix(position, direction, correctedUp, right);
  const projectionMatrix = buildPerspectiveMatrix(fov, aspect, near, far);
  const viewProjectionMatrix = projectionMatrix.clone(new Matrix4()).multiply(viewMatrix);

  return {
    position,
    direction,
    up: correctedUp,
    right,
    fov,
    aspect,
    near,
    far,
    viewportWidth,
    viewportHeight,
    viewMatrix,
    projectionMatrix,
    viewProjectionMatrix
  };
}

function buildViewMatrix(position: Vector3, direction: Vector3, up: Vector3, right: Vector3): Matrix4 {
  const dir = Vector3.normalize(direction, new Vector3());
  const negDir = Vector3.multiplyByScalar(dir, -1, new Vector3());
  const mat = new Matrix4();
  const e = mat.elements;
  e[0] = right.x; e[4] = right.y; e[8] = right.z; e[12] = -Vector3.dot(right, position);
  e[1] = up.x; e[5] = up.y; e[9] = up.z; e[13] = -Vector3.dot(up, position);
  e[2] = negDir.x; e[6] = negDir.y; e[10] = negDir.z; e[14] = -Vector3.dot(negDir, position);
  e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
  return mat;
}

function buildPerspectiveMatrix(fov: number, aspect: number, near: number, far: number): Matrix4 {
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);
  const mat = new Matrix4();
  const e = mat.elements;
  e[0] = f / aspect;
  e[5] = f;
  e[10] = (far + near) * rangeInv;
  e[11] = -1;
  e[14] = 2 * far * near * rangeInv;
  e[15] = 0;
  e[1] = e[2] = e[3] = e[4] = e[6] = e[7] = e[8] = e[9] = e[12] = e[13] = 0;
  return mat;
}

export function updateCameraViewport(camera: CameraState, width: number, height: number): void {
  camera.viewportWidth = width;
  camera.viewportHeight = height;
  camera.aspect = width / Math.max(height, 1);
  const projection = buildPerspectiveMatrix(camera.fov, camera.aspect, camera.near, camera.far);
  camera.projectionMatrix = projection;
  camera.viewProjectionMatrix = projection.clone(new Matrix4()).multiply(camera.viewMatrix);
}
