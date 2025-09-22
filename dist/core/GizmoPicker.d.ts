import { HandleHit } from '../types.js';
import { GizmoPrimitive } from './GizmoPrimitive.js';
export interface GizmoPickOptions {
    windowPosition: {
        x: number;
        y: number;
    };
}
export declare class GizmoPicker {
    private readonly scene;
    private readonly primitive;
    constructor(scene: any, primitive: GizmoPrimitive);
    pick(options: GizmoPickOptions): HandleHit | undefined;
    private priority;
}
