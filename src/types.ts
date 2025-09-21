import { Matrix4 } from './math/Matrix4.js';
import { Quaternion } from './math/Quaternion.js';
import { Vector3 } from './math/Vector3.js';

export type Axis = 'x' | 'y' | 'z';
export type Mode = 'translate' | 'rotate' | 'scale';
export type Orientation = 'global' | 'local' | 'view' | 'enu' | 'normal' | 'gimbal';
export type Pivot = 'origin' | 'median' | 'cursor' | 'individual';

export interface SnapStepConfig {
  translate: number;
  rotate: number; // radians
  scale: number;
  fineModifier?: number;
  coarseModifier?: number;
}

export interface SnapRuntimeOptions {
  enabled: boolean;
  fineModifierActive: boolean;
  coarseModifierActive: boolean;
}

export interface ManipulatorOptions {
  target?: TransformTarget | TransformTarget[];
  orientation?: Orientation;
  pivot?: Pivot;
  enableTranslate?: boolean;
  enableRotate?: boolean;
  enableScale?: boolean;
  snap?: SnapStepConfig;
  size?: ManipulatorSizeOptions;
  show?: boolean;
}

export interface ManipulatorSizeOptions {
  screenPixelRadius: number;
  minScale: number;
  maxScale: number;
}

export interface TransformDelta {
  translation: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface DragContext {
  mode: Mode;
  axis?: Axis;
  planeAxis?: [Axis, Axis];
  handleId: string;
  startPointer: { x: number; y: number };
  startRayOrigin: Vector3;
  startRayDirection: Vector3;
  startMatrix: Matrix4;
  pivotWorld: Vector3;
  frame: FrameState;
  currentDelta: TransformDelta;
}

export interface HandleVisualState {
  id: string;
  mode: Mode;
  axis?: Axis;
  planeAxis?: [Axis, Axis];
  active: boolean;
  highlighted: boolean;
}

export interface PickResult {
  handleId: string;
  mode: Mode;
  axis?: Axis;
  planeAxis?: [Axis, Axis];
  distance: number;
  screenPosition: { x: number; y: number };
}

export interface FrameState {
  origin: Vector3;
  axes: {
    x: Vector3;
    y: Vector3;
    z: Vector3;
  };
  matrix: Matrix4;
  inverse: Matrix4;
}

export interface TransformTarget {
  readonly id: string;
  getMatrix(result?: Matrix4): Matrix4;
  setMatrix(matrix: Matrix4): void;
}

export interface TransformCommand {
  id: string;
  before: Matrix4;
  after: Matrix4;
}

export interface CursorProvider {
  getCursorPosition(): Vector3 | undefined;
}

export interface HudDisplayValues {
  mode: Mode;
  axisLabel: string;
  deltaTranslation?: Vector3;
  deltaRotation?: Vector3; // in radians
  deltaScale?: Vector3;
  snapped: boolean;
}
