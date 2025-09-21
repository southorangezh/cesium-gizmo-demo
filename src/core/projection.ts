import { CameraState } from './CameraState.js';
import { Vector3 } from '../math/Vector3.js';

export interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
}

export function projectToScreen(camera: CameraState, point: Vector3): ScreenPoint | undefined {
  const e = camera.viewProjectionMatrix.elements;
  const x = point.x;
  const y = point.y;
  const z = point.z;
  const clipX = e[0] * x + e[4] * y + e[8] * z + e[12];
  const clipY = e[1] * x + e[5] * y + e[9] * z + e[13];
  const clipZ = e[2] * x + e[6] * y + e[10] * z + e[14];
  const clipW = e[3] * x + e[7] * y + e[11] * z + e[15];
  if (clipW === 0) {
    return undefined;
  }
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  const ndcZ = clipZ / clipW;
  const screenX = (ndcX * 0.5 + 0.5) * camera.viewportWidth;
  const screenY = (1 - (ndcY * 0.5 + 0.5)) * camera.viewportHeight;
  return { x: screenX, y: screenY, depth: ndcZ };
}
