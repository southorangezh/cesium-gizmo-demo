import { DragPayload, HandleHit, Mode, SnapConfig } from '../types.js';
import { GizmoPicker } from './GizmoPicker.js';
import { GizmoPrimitive } from './GizmoPrimitive.js';
import { FrameState } from './FrameBuilder.js';
import { TransformSolver } from './TransformSolver.js';
import { SolverResult } from '../types.js';
export type ControllerEvent = {
    type: 'hover';
    handle?: HandleHit;
} | {
    type: 'drag-start';
    handle: HandleHit;
    payload: DragPayload;
} | {
    type: 'drag-update';
    handle: HandleHit;
    payload: DragPayload;
    result: SolverResult;
} | {
    type: 'drag-end';
    handle: HandleHit;
    payload: DragPayload;
    result: SolverResult;
    cancelled: boolean;
};
export declare class ManipulatorController {
    private readonly scene;
    private readonly canvas;
    private readonly picker;
    private readonly primitive;
    private readonly solver;
    private readonly listeners;
    private readonly snapConfigs;
    private enabled;
    private state;
    constructor(scene: any, canvas: HTMLCanvasElement, picker: GizmoPicker, primitive: GizmoPrimitive, solver: TransformSolver);
    on(listener: (event: ControllerEvent) => void): () => void;
    setFrame(frame: FrameState): void;
    setSnapConfig(mode: Mode, config?: SnapConfig): void;
    setEnabled(enabled: boolean): void;
    destroy(): void;
    private pointerMove;
    private pointerDown;
    private keyDown;
    private pointerUp;
    private finishDrag;
    private emit;
    private windowPosition;
    private computePayload;
    private intersect;
}
