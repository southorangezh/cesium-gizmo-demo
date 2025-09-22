import { Axis, Mode } from '../types.js';
import { FrameState } from './FrameBuilder.js';
import { Vector3 } from '../math/Vector3.js';
interface HandleDescriptor {
    id: string;
    mode: Mode;
    axis?: Axis;
    type: 'axis' | 'plane' | 'ring' | 'uniform';
    color: any;
    highlightColor: any;
    activeColor: any;
    primitive: any;
}
export interface GizmoSizeOptions {
    radius: number;
    minScale: number;
    maxScale: number;
}
export declare class GizmoPrimitive {
    private readonly scene;
    private readonly root;
    private readonly axisLines;
    private readonly points;
    private readonly rings;
    private readonly handles;
    private visible;
    private modeVisibility;
    constructor(scene: any);
    getHandle(id: string): HandleDescriptor | undefined;
    getHandleIds(): string[];
    private buildHandles;
    private createTranslateHandles;
    private createScaleHandles;
    private createRotationRings;
    update(frame: FrameState, size: GizmoSizeOptions, cameraPosition: Vector3): void;
    setVisible(visible: boolean): void;
    setModeEnabled(mode: Mode, enabled: boolean): void;
    highlight(handleId: string | undefined, state: 'none' | 'hover' | 'active'): void;
    destroy(): void;
    private applyVisibility;
    private updateTranslateHandles;
    private updateScaleHandles;
    private updateRotationRings;
    private rotationBasis;
    private computeScale;
    private resolveColor;
}
export {};
