import type { Cartesian3, Matrix4, Quaternion } from 'cesium';

export type Axis = 'x' | 'y' | 'z';
export type Mode = 'translate' | 'rotate' | 'scale';
export type Orientation = 'global' | 'local' | 'view' | 'enu' | 'normal' | 'gimbal';
export type Pivot = 'origin' | 'median' | 'cursor' | 'individual';

export interface ManipulatorOptions {
  target?: TransformTarget | TransformTarget[];
  orientation?: Orientation;
  pivot?: Pivot;
  enable?: Partial<Record<Mode, boolean>>;
  snap?: SnapConfig;
  size?: SizeConfig;
}

export interface SizeConfig {
  screenPixelRadius: number;
  minScale: number;
  maxScale: number;
}

export interface SnapConfig {
  translate?: number;
  rotate?: number;
  scale?: number;
  precisionOverride?: number;
}

export interface TransformDelta {
  translation: Cartesian3;
  rotation: Quaternion;
  scale: Cartesian3;
}

export interface TransformState extends TransformDelta {
  matrix: Matrix4;
}

export interface TransformTarget {
  readonly id?: string;
  readonly entity?: unknown;
  getMatrix(out?: Matrix4): Matrix4;
  setMatrix(matrix: Matrix4): void;
  commit?(matrix: Matrix4): void;
}

export interface Frame {
  origin: Cartesian3;
  axes: { x: Cartesian3; y: Cartesian3; z: Cartesian3 };
  matrix: Matrix4;
}

export interface PivotResult {
  origin: Cartesian3;
  targets: TransformTarget[];
}

export interface PointerInfo {
  rayOrigin: Cartesian3;
  rayDirection: Cartesian3;
  windowPosition: { x: number; y: number };
}

export interface SolveRequest {
  mode: Mode;
  axis?: Axis;
  plane?: [Axis, Axis];
  frame: Frame;
  pivot: Cartesian3;
  pointer: PointerInfo;
  startPointer: PointerInfo;
  snapper: Snapper;
  initialState: TransformState;
  cameraDirection: Cartesian3;
}

export interface SolveResponse {
  delta: TransformDelta;
}

export interface Snapper {
  snapTranslation(value: number, axis: Axis): number;
  snapRotation(value: number, axis: Axis | 'view'): number;
  snapScale(value: number, axis: Axis | 'uniform'): number;
}

export interface HandleHit {
  id: string;
  mode: Mode;
  axis?: Axis;
  plane?: [Axis, Axis];
  priority: number;
  windowPosition: { x: number; y: number };
}

export interface SnapContext {
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

export interface SnapProfile {
  translationStep: number;
  rotationStep: number;
  scaleStep: number;
  microFactor: number;
}
