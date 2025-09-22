export type Axis = 'x' | 'y' | 'z';
export type Mode = 'translate' | 'rotate' | 'scale';
export type Orientation = 'global' | 'local' | 'view' | 'enu' | 'normal' | 'gimbal';
export type Pivot = 'origin' | 'median' | 'cursor' | 'individual';

export interface SnapConfig {
  translate?: number;
  rotate?: number; // radians
  scale?: number;
  enabled?: boolean;
  modifierSteps?: {
    ctrl?: number;
    shift?: number;
  };
}

export interface ManipulatorOptions {
  target?: ManipulableTarget | ManipulableTarget[];
  orientation?: Orientation;
  pivot?: Pivot;
  enableModes?: Partial<Record<Mode, boolean>>;
  snap?: SnapConfig;
  screenScale?: {
    radius?: number;
    minScale?: number;
    maxScale?: number;
  };
  show?: boolean;
}

export interface ManipulableTarget {
  id: string;
  matrix: number[]; // column-major 4x4
  parentMatrix?: number[];
  metadata?: Record<string, unknown>;
}

export interface HandleHit {
  id: string;
  mode: Mode;
  axis?: Axis;
  type: 'axis' | 'plane' | 'free' | 'ring' | 'uniform';
  priority: number;
  screenPosition: { x: number; y: number };
}

export interface TransformDelta {
  translation: Vector3Values;
  rotation: QuaternionValues;
  scale: Vector3Values;
}

export interface Vector3Values {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionValues {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface DragPayload {
  mode: Mode;
  axis?: Axis;
  planeNormal?: Vector3Values;
  initialRay: RayState;
  currentRay: RayState;
  snap?: SnapConfig;
}

export interface RayState {
  origin: Vector3Values;
  direction: Vector3Values;
}

export interface SolverResult {
  deltaTranslation: Vector3Values;
  deltaRotation: QuaternionValues;
  deltaScale: Vector3Values;
  raw: {
    translation: number;
    rotation: number;
    scale: number;
  };
}

export interface SnapResult {
  value: number;
  applied: boolean;
  step: number;
}

export interface HudState {
  mode: Mode;
  axis?: Axis;
  deltaTranslation?: Vector3Values;
  deltaRotation?: Vector3Values;
  deltaScale?: Vector3Values;
  snap?: SnapResult;
  active?: boolean;
}
