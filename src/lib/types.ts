import type { Cartesian3, Matrix4, Quaternion } from 'cesium';

export type Axis = 'x' | 'y' | 'z';
export type Mode = 'translate' | 'rotate' | 'scale';
export type Orientation = 'global' | 'local' | 'view' | 'enu' | 'normal' | 'gimbal';
export type Pivot = 'origin' | 'median' | 'cursor' | 'individual';

export interface ScreenSizeOptions {
  screenPixelRadius: number;
  minScale: number;
  maxScale: number;
}

export interface SnapStepConfig {
  translation: number;
  rotation: number;
  scale: number;
}

export interface TargetLike {
  id?: string | number;
  /** Returns world matrix (modelMatrix) */
  getMatrix(): Matrix4;
  setMatrix(matrix: Matrix4): void;
  getPosition(): Cartesian3;
  getOrientation(): Quaternion | undefined;
}

export type ManipulatorTarget = TargetLike | TargetLike[];

export interface ManipulatorOptions {
  target?: ManipulatorTarget;
  orientation?: Orientation;
  pivot?: Pivot;
  enable?: Partial<Record<Mode, boolean>>;
  snap?: Partial<SnapStepConfig>;
  size?: Partial<ScreenSizeOptions>;
  cursorPosition?: Cartesian3;
}

export interface TransformDelta {
  translation: Cartesian3;
  rotation: Quaternion;
  scale: Cartesian3;
}

export interface DragResult {
  delta: TransformDelta;
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
}

export interface DragContext {
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
}

export type HandleType =
  | 'translate-axis'
  | 'translate-plane'
  | 'translate-free'
  | 'rotate-axis'
  | 'rotate-view'
  | 'scale-axis'
  | 'scale-uniform';

export interface HandleInfo {
  id: string;
  type: HandleType;
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
  priority: number;
  screenPosition: { x: number; y: number } | null;
}

export interface DragState {
  context: DragContext;
  startMatrix: Matrix4;
}
