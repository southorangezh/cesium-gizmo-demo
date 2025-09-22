import { ManipulableTarget, Orientation, Pivot } from '../types.js';
import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
export interface CameraState {
    position: Vector3;
    direction: Vector3;
    up: Vector3;
}
export interface FrameBuilderOptions {
    targets: ManipulableTarget[];
    orientation: Orientation;
    pivot: Pivot;
    pivotPoint: Vector3;
    camera?: CameraState;
    normal?: Vector3;
}
export interface FrameState {
    origin: Vector3;
    axes: {
        x: Vector3;
        y: Vector3;
        z: Vector3;
    };
    quaternion: Quaternion;
    orientation: Orientation;
    pivot: Pivot;
}
export declare class FrameBuilder {
    build(options: FrameBuilderOptions): FrameState;
    private computeBasis;
    private localBasisFromTargets;
    private viewBasis;
    private enuBasis;
    private normalBasis;
    private quaternionFromAxes;
}
export declare function ecefToCartographic(position: Vector3): {
    lon: number;
    lat: number;
    height: number;
};
