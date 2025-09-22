export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    static fromArray(array, offset = 0) {
        return new Vector3(array[offset], array[offset + 1], array[offset + 2]);
    }
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    addScaledVector(v, scale) {
        this.x += v.x * scale;
        this.y += v.y * scale;
        this.z += v.z * scale;
        return this;
    }
    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    multiplyScalar(scale) {
        this.x *= scale;
        this.y *= scale;
        this.z *= scale;
        return this;
    }
    divideScalar(scale) {
        if (scale === 0) {
            throw new Error('Division by zero in Vector3.divideScalar');
        }
        return this.multiplyScalar(1 / scale);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length() {
        return Math.sqrt(this.lengthSquared());
    }
    normalize() {
        const len = this.length();
        if (len < 1e-12) {
            return this.set(0, 0, 0);
        }
        return this.divideScalar(len);
    }
    distanceTo(v) {
        return Math.sqrt(this.distanceToSquared(v));
    }
    distanceToSquared(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }
    applyMatrix3(m) {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        this.x = m[0] * x + m[3] * y + m[6] * z;
        this.y = m[1] * x + m[4] * y + m[7] * z;
        this.z = m[2] * x + m[5] * y + m[8] * z;
        return this;
    }
    applyMatrix4(m) {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        const invW = w !== 0 ? 1 / w : 1;
        this.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
        this.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
        this.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
        return this;
    }
    projectOnVector(vector) {
        const denominator = vector.lengthSquared();
        if (denominator === 0) {
            return this.set(0, 0, 0);
        }
        const scalar = this.dot(vector) / denominator;
        return this.copy(vector).multiplyScalar(scalar);
    }
    projectOnPlane(normal) {
        const projection = this.clone().projectOnVector(normal);
        return this.subtract(projection);
    }
    angleTo(v) {
        const denom = Math.sqrt(this.lengthSquared() * v.lengthSquared());
        if (denom === 0) {
            return 0;
        }
        let theta = this.dot(v) / denom;
        theta = Math.min(Math.max(theta, -1), 1);
        return Math.acos(theta);
    }
    equals(v, epsilon = 1e-6) {
        return (Math.abs(this.x - v.x) <= epsilon &&
            Math.abs(this.y - v.y) <= epsilon &&
            Math.abs(this.z - v.z) <= epsilon);
    }
    toArray(out = [], offset = 0) {
        out[offset] = this.x;
        out[offset + 1] = this.y;
        out[offset + 2] = this.z;
        return out;
    }
}
