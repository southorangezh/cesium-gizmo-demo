import { DragPayload, SnapConfig, SolverResult } from '../types.js';
import { Snapper, SnapContext } from './Snapper.js';
import { FrameState } from './FrameBuilder.js';
export interface TransformSolverOptions {
    snapper?: Snapper;
}
export declare class TransformSolver {
    private readonly snapper;
    constructor(options?: TransformSolverOptions);
    solve(frame: FrameState, payload: DragPayload, snapConfig?: SnapConfig, context?: SnapContext): SolverResult;
    private solveTranslate;
    private solveRotate;
    private solveScale;
    private axisVector;
}
