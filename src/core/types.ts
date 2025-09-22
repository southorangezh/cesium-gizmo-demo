export type Axis = 'x' | 'y' | 'z';
export type Mode = 'translate' | 'rotate' | 'scale';
export type Orientation = 'global' | 'local' | 'view' | 'enu' | 'normal' | 'gimbal';
export type Pivot = 'origin' | 'median' | 'cursor' | 'individual';

export interface Ray {
  origin: [number, number, number];
  direction: [number, number, number];
}

export interface TransformDelta {
  translation: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
}

export interface TargetTransform {
  matrix: number[]; // 16 elements column-major
}

export interface TargetLike {
  id?: string;
  matrix?: number[];
  position?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
}

export interface TransformSession {
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
  uniformScale?: boolean;
  viewNormal?: [number, number, number];
}

export interface SnapConfig {
  translateStep?: number;
  rotateStep?: number;
  scaleStep?: number;
  fineTranslateFactor?: number;
  fineRotateFactor?: number;
  fineScaleFactor?: number;
}

export interface FrameState {
  pivot: [number, number, number];
  axes: {
    x: [number, number, number];
    y: [number, number, number];
    z: [number, number, number];
  };
  matrix: number[];
}

export interface ManipulatorOptions {
  target?: TargetLike | TargetLike[];
  orientation?: Orientation;
  pivot?: Pivot;
  enableTranslate?: boolean;
  enableRotate?: boolean;
  enableScale?: boolean;
  snap?: SnapConfig;
  screenPixelRadius?: number;
  minScale?: number;
  maxScale?: number;
}

export interface HandleHit {
  id: string;
  mode: Mode;
  axis?: Axis;
  planeAxes?: [Axis, Axis];
  uniformScale?: boolean;
  priority: number;
  screenPosition: { x: number; y: number };
}

export interface CameraInfo {
  position: [number, number, number];
  direction: [number, number, number];
  up: [number, number, number];
  right: [number, number, number];
}

export interface CursorState {
  position: [number, number, number];
  normal?: [number, number, number];
}

export interface PivotResult {
  pivot: [number, number, number];
  perTarget?: Array<{ target: TargetLike; pivot: [number, number, number] }>;
}

export interface TransformCommand {
  targets: TargetLike[];
  delta: TransformDelta;
}

export interface CommandStack {
  push(command: TransformCommand): void;
  undo(): void;
  redo(): void;
  clear(): void;
}

