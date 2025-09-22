import { Matrix4 } from '../math/Matrix4.js';
import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
import { decomposeMatrix, normalizeOrZero } from './utils.js';
const WORLD_X = new Vector3(1, 0, 0);
const WORLD_Y = new Vector3(0, 1, 0);
const WORLD_Z = new Vector3(0, 0, 1);
const WGS84_A = 6378137.0;
const WGS84_E2 = 6.69437999019758e-3;
export class FrameBuilder {
    build(options) {
        const { orientation, pivot, pivotPoint, targets } = options;
        const origin = pivotPoint.clone();
        const basis = this.computeBasis(options, origin, targets);
        const quaternion = this.quaternionFromAxes(basis.x, basis.y, basis.z);
        return {
            origin,
            axes: basis,
            quaternion,
            orientation,
            pivot
        };
    }
    computeBasis(options, origin, targets) {
        var _a;
        const orientation = options.orientation;
        switch (orientation) {
            case 'global':
                return { x: WORLD_X.clone(), y: WORLD_Y.clone(), z: WORLD_Z.clone() };
            case 'local':
            case 'gimbal':
                return this.localBasisFromTargets(targets);
            case 'view':
                return this.viewBasis(options.camera);
            case 'enu':
                return this.enuBasis(origin);
            case 'normal':
                return this.normalBasis((_a = options.normal) !== null && _a !== void 0 ? _a : WORLD_Z);
            default:
                return { x: WORLD_X.clone(), y: WORLD_Y.clone(), z: WORLD_Z.clone() };
        }
    }
    localBasisFromTargets(targets) {
        if (targets.length === 0) {
            return { x: WORLD_X.clone(), y: WORLD_Y.clone(), z: WORLD_Z.clone() };
        }
        const quaternions = targets.map((target) => decomposeMatrix(target.matrix).rotation);
        const reference = quaternions[0].clone();
        // Average using simple iterative slerp
        for (let i = 1; i < quaternions.length; i += 1) {
            reference.slerp(quaternions[i], 1 / (i + 1));
        }
        const matrix = new Matrix4().makeRotationFromQuaternion(reference);
        const x = new Vector3(matrix.elements[0], matrix.elements[1], matrix.elements[2]).normalize();
        const y = new Vector3(matrix.elements[4], matrix.elements[5], matrix.elements[6]).normalize();
        const z = new Vector3(matrix.elements[8], matrix.elements[9], matrix.elements[10]).normalize();
        return { x, y, z };
    }
    viewBasis(camera) {
        if (!camera) {
            return { x: WORLD_X.clone(), y: WORLD_Y.clone(), z: WORLD_Z.clone() };
        }
        const z = camera.direction.clone().normalize();
        const x = camera.direction.clone().cross(camera.up.clone()).normalize();
        if (x.length() < 1e-6) {
            x.set(1, 0, 0);
        }
        const y = z.clone().cross(x).normalize();
        return { x, y, z };
    }
    enuBasis(origin) {
        const { lat, lon } = ecefToCartographic(origin);
        const sinLat = Math.sin(lat);
        const cosLat = Math.cos(lat);
        const sinLon = Math.sin(lon);
        const cosLon = Math.cos(lon);
        const east = new Vector3(-sinLon, cosLon, 0).normalize();
        const north = new Vector3(-sinLat * cosLon, -sinLat * sinLon, cosLat).normalize();
        const up = new Vector3(cosLat * cosLon, cosLat * sinLon, sinLat).normalize();
        return { x: east, y: north, z: up };
    }
    normalBasis(normal) {
        const z = normalizeOrZero(normal);
        let reference = WORLD_Z;
        if (Math.abs(z.dot(reference)) > 0.99) {
            reference = WORLD_X;
        }
        const x = reference.clone().cross(z).normalize();
        const y = z.clone().cross(x).normalize();
        return { x, y, z };
    }
    quaternionFromAxes(x, y, z) {
        const m = [
            x.x, y.x, z.x, 0,
            x.y, y.y, z.y, 0,
            x.z, y.z, z.z, 0,
            0, 0, 0, 1
        ];
        return new Quaternion().setFromRotationMatrix(m);
    }
}
export function ecefToCartographic(position) {
    const x = position.x;
    const y = position.y;
    const z = position.z;
    const lon = Math.atan2(y, x);
    const p = Math.sqrt(x * x + y * y);
    let lat = Math.atan2(z, p * (1 - WGS84_E2));
    let height = 0;
    for (let i = 0; i < 5; i += 1) {
        const sinLat = Math.sin(lat);
        const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
        height = p / Math.cos(lat) - N;
        lat = Math.atan2(z, p * (1 - WGS84_E2 * (N / (N + height))));
    }
    return { lon, lat, height };
}
