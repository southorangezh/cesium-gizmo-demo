export interface Cartesian3Like {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

export type Axis = "x" | "y" | "z";
export type Mode = "translate" | "rotate" | "scale";
export type Orientation = "global" | "local" | "view" | "enu" | "normal" | "gimbal";
export type Pivot = "origin" | "median" | "cursor" | "individual";

export type TargetLike = {
  id?: string;
  matrix?: number[];
  position?: Cartesian3Like;
  orientation?: QuaternionLike;
  parent?: TargetLike;
};

export interface ScreenSizeOptions {
  pixelRadius: number;
  minScale: number;
  maxScale: number;
}

export interface SnapStepConfig {
  translate?: number;
  rotate?: number;
  scale?: number;
  fineModifier?: number;
  coarseModifier?: number;
}

export interface ManipulatorOptions {
  target?: TargetLike | TargetLike[] | null;
  orientation?: Orientation;
  pivot?: Pivot;
  enabledModes?: Mode[];
  enableFreeTranslate?: boolean;
  enableUniformScale?: boolean;
  enableViewRotate?: boolean;
  snap?: SnapStepConfig;
  screenSize?: ScreenSizeOptions;
}

export interface GizmoHandleHit {
  id: string;
  mode: Mode;
  axis?: Axis;
  priority: number;
  position: Cartesian3Like;
}

export interface TransformDelta {
  translation: Cartesian3Like;
  rotation: QuaternionLike;
  scale: Cartesian3Like;
}

export interface PointerState {
  start?: Cartesian3Like;
  current?: Cartesian3Like;
  startRay?: Cartesian3Like;
  currentRay?: Cartesian3Like;
  screenStart: { x: number; y: number };
  screenCurrent: { x: number; y: number };
}

export interface ManipulatorEventCallbacks {
  onBegin?: (mode: Mode, handle: GizmoHandleHit) => void;
  onUpdate?: (delta: TransformDelta) => void;
  onEnd?: (committed: boolean, delta: TransformDelta) => void;
}

export interface PivotResult {
  pivot: Cartesian3Like;
  targets: TargetLike[];
}

export interface SolverResult {
  delta: TransformDelta;
  rawDelta: TransformDelta;
  snapped: boolean;
}

