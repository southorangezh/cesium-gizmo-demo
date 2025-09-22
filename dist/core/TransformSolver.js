import { Quaternion } from '../math/Quaternion.js';
import { Vector3 } from '../math/Vector3.js';
import { Snapper } from './Snapper.js';
export class TransformSolver {
    constructor(options = {}) {
        var _a;
        this.snapper = (_a = options.snapper) !== null && _a !== void 0 ? _a : new Snapper();
    }
    solve(frame, payload, snapConfig, context = {}) {
        switch (payload.mode) {
            case 'translate':
                return this.solveTranslate(frame, payload, snapConfig, context);
            case 'rotate':
                return this.solveRotate(frame, payload, snapConfig, context);
            case 'scale':
                return this.solveScale(frame, payload, snapConfig, context);
            default:
                throw new Error(`Unsupported mode ${payload.mode}`);
        }
    }
    solveTranslate(frame, payload, snapConfig, context = {}) {
        const initial = vectorFromState(payload.initialRay.origin);
        const current = vectorFromState(payload.currentRay.origin);
        const deltaVec = current.clone().subtract(initial);
        let projected = deltaVec.clone();
        if (payload.axis) {
            const axisVector = this.axisVector(frame, payload.axis);
            const amount = deltaVec.dot(axisVector);
            const snapped = this.snapper.apply(amount, snapConfig, context);
            projected = axisVector.clone().multiplyScalar(snapped.value);
            return {
                deltaTranslation: toValues(projected),
                deltaRotation: identityRotation(),
                deltaScale: identityScale(),
                raw: { translation: snapped.value, rotation: 0, scale: 0 }
            };
        }
        // plane or free movement
        const snappedX = this.snapper.apply(projected.x, snapConfig, context);
        const snappedY = this.snapper.apply(projected.y, snapConfig, context);
        const snappedZ = this.snapper.apply(projected.z, snapConfig, context);
        projected.set(snappedX.value, snappedY.value, snappedZ.value);
        return {
            deltaTranslation: toValues(projected),
            deltaRotation: identityRotation(),
            deltaScale: identityScale(),
            raw: { translation: projected.length(), rotation: 0, scale: 0 }
        };
    }
    solveRotate(frame, payload, snapConfig, context = {}) {
        const origin = frame.origin;
        const start = vectorFromState(payload.initialRay.origin).subtract(origin);
        const end = vectorFromState(payload.currentRay.origin).subtract(origin);
        const axisVector = payload.axis ? this.axisVector(frame, payload.axis) : frame.axes.z;
        const planeNormal = axisVector.clone().normalize();
        const startProj = projectOnPlane(start, planeNormal);
        const endProj = projectOnPlane(end, planeNormal);
        if (startProj.length() < 1e-6 || endProj.length() < 1e-6) {
            return emptyResult();
        }
        const angle = signedAngle(startProj, endProj, planeNormal);
        const snapped = this.snapper.apply(angle, snapConfig, context);
        const quaternion = Quaternion.fromAxisAngle(axisVector, snapped.value);
        return {
            deltaTranslation: zeroVectorValues(),
            deltaRotation: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
            deltaScale: identityScale(),
            raw: { translation: 0, rotation: snapped.value, scale: 0 }
        };
    }
    solveScale(frame, payload, snapConfig, context = {}) {
        const origin = frame.origin;
        const start = vectorFromState(payload.initialRay.origin).subtract(origin);
        const end = vectorFromState(payload.currentRay.origin).subtract(origin);
        if (payload.axis) {
            const axisVector = this.axisVector(frame, payload.axis).normalize();
            const startLen = start.dot(axisVector);
            const endLen = end.dot(axisVector);
            const ratio = safeDivision(endLen, startLen);
            const snapped = this.snapper.apply(ratio, snapConfig, context);
            const scale = identityScale();
            if (payload.axis === 'x') {
                scale.x = snapped.value;
            }
            else if (payload.axis === 'y') {
                scale.y = snapped.value;
            }
            else if (payload.axis === 'z') {
                scale.z = snapped.value;
            }
            return {
                deltaTranslation: zeroVectorValues(),
                deltaRotation: identityRotation(),
                deltaScale: scale,
                raw: { translation: 0, rotation: 0, scale: snapped.value }
            };
        }
        const startLen = start.length();
        const endLen = end.length();
        const ratio = safeDivision(endLen, startLen);
        const snapped = this.snapper.apply(ratio, snapConfig, context);
        return {
            deltaTranslation: zeroVectorValues(),
            deltaRotation: identityRotation(),
            deltaScale: { x: snapped.value, y: snapped.value, z: snapped.value },
            raw: { translation: 0, rotation: 0, scale: snapped.value }
        };
    }
    axisVector(frame, axis) {
        switch (axis) {
            case 'x':
                return frame.axes.x.clone().normalize();
            case 'y':
                return frame.axes.y.clone().normalize();
            case 'z':
                return frame.axes.z.clone().normalize();
            default:
                return frame.axes.x.clone();
        }
    }
}
function toValues(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
}
function zeroVectorValues() {
    return { x: 0, y: 0, z: 0 };
}
function identityRotation() {
    return { x: 0, y: 0, z: 0, w: 1 };
}
function identityScale() {
    return { x: 1, y: 1, z: 1 };
}
function emptyResult() {
    return {
        deltaTranslation: zeroVectorValues(),
        deltaRotation: identityRotation(),
        deltaScale: identityScale(),
        raw: { translation: 0, rotation: 0, scale: 0 }
    };
}
function vectorFromState(state) {
    return new Vector3(state.x, state.y, state.z);
}
function projectOnPlane(vector, planeNormal) {
    const normal = planeNormal.clone().normalize();
    const projection = normal.clone().multiplyScalar(vector.dot(normal));
    return vector.clone().subtract(projection);
}
function signedAngle(a, b, normal) {
    const cross = a.clone().cross(b.clone());
    const sin = cross.length();
    const cos = a.clone().normalize().dot(b.clone().normalize());
    let angle = Math.atan2(sin, cos);
    const sign = Math.sign(cross.dot(normal));
    if (sign < 0) {
        angle = -angle;
    }
    return angle;
}
function safeDivision(numerator, denominator) {
    if (Math.abs(denominator) < 1e-6) {
        return 1;
    }
    return numerator / denominator;
}
