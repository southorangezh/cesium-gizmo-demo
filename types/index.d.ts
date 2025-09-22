export type Axis = 'x' | 'y' | 'z';
export type Mode = 'translate' | 'rotate' | 'scale';
export type Orientation = 'global' | 'local' | 'view' | 'enu' | 'normal' | 'gimbal';
export type Pivot = 'origin' | 'median' | 'cursor' | 'individual';

export interface ManipulatorOptions {
  canvas: HTMLCanvasElement;
  createRay: (event: PointerEvent) => any;
  getCamera: () => any;
  overlayContainer?: HTMLElement;
  snap?: {
    translate?: number;
    rotate?: number;
    scale?: number;
    modifiers?: Record<string, { key: string; multiplier: number }>;
  };
  colors?: Record<string, string>;
  size?: {
    screenPixelRadius?: number;
    minScale?: number;
    maxScale?: number;
  };
}

export declare class UniversalManipulator {
  constructor(options: ManipulatorOptions);
  setTarget(target: any | any[]): void;
  setMode(mode: Mode): void;
  setOrientation(orientation: Orientation): void;
  setPivot(pivot: Pivot): void;
  setSnap(config: ManipulatorOptions['snap']): void;
  setSize(screenPixelRadius: number, minScale: number, maxScale: number): void;
  setShow(value: boolean): void;
  updateCursor(position: any): void;
  destroy(): void;
}
