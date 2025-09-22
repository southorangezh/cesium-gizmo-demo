import { Vector3 } from './Vector3.js';
export class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    static identity() {
        return new Quaternion(0, 0, 0, 1);
    }
    static fromAxisAngle(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        const normalized = axis.clone().normalize();
        return new Quaternion(normalized.x * s, normalized.y * s, normalized.z * s, Math.cos(halfAngle));
    }
    clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }
    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }
    copy(q) {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }
    multiply(q) {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        this.x = w * q.x + x * q.w + y * q.z - z * q.y;
        this.y = w * q.y - x * q.z + y * q.w + z * q.x;
        this.z = w * q.z + x * q.y - y * q.x + z * q.w;
        this.w = w * q.w - x * q.x - y * q.y - z * q.z;
        return this;
    }
    premultiply(q) {
        return this.copy(q.clone().multiply(this));
    }
    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (len === 0) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 1;
        }
        else {
            const invLen = 1 / len;
            this.x *= invLen;
            this.y *= invLen;
            this.z *= invLen;
            this.w *= invLen;
        }
        return this;
    }
    inverse() {
        return this.conjugate().normalize();
    }
    conjugate() {
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;
        return this;
    }
    rotateVector(vector) {
        const qVector = new Vector3(this.x, this.y, this.z);
        const uv = qVector.clone().cross(vector.clone());
        const uuv = qVector.clone().cross(uv.clone());
        uv.multiplyScalar(2 * this.w);
        uuv.multiplyScalar(2);
        return vector.clone().add(uv).add(uuv);
    }
    toMatrix3() {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const xy = x * y;
        const xz = x * z;
        const yz = y * z;
        const wx = w * x;
        const wy = w * y;
        const wz = w * z;
        return [
            1 - 2 * (yy + zz),
            2 * (xy + wz),
            2 * (xz - wy),
            2 * (xy - wz),
            1 - 2 * (xx + zz),
            2 * (yz + wx),
            2 * (xz + wy),
            2 * (yz - wx),
            1 - 2 * (xx + yy)
        ];
    }
    setFromRotationMatrix(matrix) {
        const te = matrix;
        const m11 = te[0], m12 = te[4], m13 = te[8];
        const m21 = te[1], m22 = te[5], m23 = te[9];
        const m31 = te[2], m32 = te[6], m33 = te[10];
        const trace = m11 + m22 + m33;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            this.w = 0.25 / s;
            this.x = (m32 - m23) * s;
            this.y = (m13 - m31) * s;
            this.z = (m21 - m12) * s;
        }
        else if (m11 > m22 && m11 > m33) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
            this.w = (m32 - m23) / s;
            this.x = 0.25 * s;
            this.y = (m12 + m21) / s;
            this.z = (m13 + m31) / s;
        }
        else if (m22 > m33) {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
            this.w = (m13 - m31) / s;
            this.x = (m12 + m21) / s;
            this.y = 0.25 * s;
            this.z = (m23 + m32) / s;
        }
        else {
            const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = (m13 + m31) / s;
            this.y = (m23 + m32) / s;
            this.z = 0.25 * s;
        }
        return this.normalize();
    }
    toAxisAngle() {
        if (this.w > 1) {
            this.normalize();
        }
        const angle = 2 * Math.acos(this.w);
        const s = Math.sqrt(1 - this.w * this.w);
        if (s < 1e-6) {
            return { axis: new Vector3(1, 0, 0), angle };
        }
        return { axis: new Vector3(this.x / s, this.y / s, this.z / s), angle };
    }
    slerp(q, t) {
        let cosHalfTheta = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
        if (cosHalfTheta < 0) {
            q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
            cosHalfTheta = -cosHalfTheta;
        }
        if (cosHalfTheta >= 1.0) {
            return this;
        }
        const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);
        if (Math.abs(sinHalfTheta) < 0.001) {
            this.x = (this.x * 0.5 + q.x * 0.5);
            this.y = (this.y * 0.5 + q.y * 0.5);
            this.z = (this.z * 0.5 + q.z * 0.5);
            this.w = (this.w * 0.5 + q.w * 0.5);
            return this;
        }
        const halfTheta = Math.acos(cosHalfTheta);
        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
        this.x = this.x * ratioA + q.x * ratioB;
        this.y = this.y * ratioA + q.y * ratioB;
        this.z = this.z * ratioA + q.z * ratioB;
        this.w = this.w * ratioA + q.w * ratioB;
        return this;
    }
}
