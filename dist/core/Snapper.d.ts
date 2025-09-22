import { SnapConfig, SnapResult } from '../types.js';
export interface SnapContext {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    inputStep?: number;
}
export declare class Snapper {
    apply(value: number, config?: SnapConfig, context?: SnapContext): SnapResult;
}
