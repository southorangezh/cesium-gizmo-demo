import { Vector3 } from '../math/Vector3.js';
export class ManipulatorController {
    constructor(scene, canvas, picker, primitive, solver) {
        this.listeners = new Set();
        this.snapConfigs = {};
        this.enabled = true;
        this.state = { dragging: false };
        this.scene = scene;
        this.canvas = canvas;
        this.picker = picker;
        this.primitive = primitive;
        this.solver = solver;
        this.pointerMove = this.pointerMove.bind(this);
        this.pointerDown = this.pointerDown.bind(this);
        this.pointerUp = this.pointerUp.bind(this);
        this.keyDown = this.keyDown.bind(this);
        canvas.addEventListener('pointermove', this.pointerMove);
        canvas.addEventListener('pointerdown', this.pointerDown);
        window.addEventListener('pointerup', this.pointerUp);
        window.addEventListener('keydown', this.keyDown);
    }
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    setFrame(frame) {
        this.state.frame = frame;
    }
    setSnapConfig(mode, config) {
        if (config) {
            this.snapConfigs[mode] = config;
        }
        else {
            delete this.snapConfigs[mode];
        }
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    destroy() {
        this.canvas.removeEventListener('pointermove', this.pointerMove);
        this.canvas.removeEventListener('pointerdown', this.pointerDown);
        window.removeEventListener('pointerup', this.pointerUp);
        window.removeEventListener('keydown', this.keyDown);
    }
    pointerMove(event) {
        if (!this.enabled) {
            return;
        }
        const position = this.windowPosition(event);
        if (!this.state.dragging) {
            const hit = this.picker.pick({ windowPosition: position });
            this.emit({ type: 'hover', handle: hit });
            this.primitive.highlight(hit === null || hit === void 0 ? void 0 : hit.id, hit ? 'hover' : 'none');
            return;
        }
        if (!this.state.activeHandle || !this.state.payload || !this.state.frame) {
            return;
        }
        const updatedPayload = this.computePayload(this.state.activeHandle, this.state.frame, position, this.state.payload.initialRay.origin);
        if (!updatedPayload) {
            return;
        }
        this.state.payload = updatedPayload;
        const snap = this.snapConfigs[this.state.activeHandle.mode];
        const result = this.solver.solve(this.state.frame, updatedPayload, snap, {
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey
        });
        this.state.result = result;
        this.emit({ type: 'drag-update', handle: this.state.activeHandle, payload: updatedPayload, result });
    }
    pointerDown(event) {
        if (!this.enabled) {
            return;
        }
        if (!this.state.frame) {
            return;
        }
        const position = this.windowPosition(event);
        const hit = this.picker.pick({ windowPosition: position });
        if (!hit) {
            return;
        }
        const payload = this.computePayload(hit, this.state.frame, position);
        if (!payload) {
            return;
        }
        this.state = {
            ...this.state,
            activeHandle: hit,
            payload,
            dragging: true
        };
        this.primitive.highlight(hit.id, 'active');
        this.emit({ type: 'drag-start', handle: hit, payload });
        event.preventDefault();
    }
    keyDown(event) {
        if (event.key === 'Escape' && this.state.dragging) {
            this.finishDrag(true, event);
        }
    }
    pointerUp(event) {
        this.finishDrag(false, event);
    }
    finishDrag(cancelled, event) {
        var _a, _b;
        if (!this.state.dragging) {
            return;
        }
        const { activeHandle, payload, result } = this.state;
        this.state = { dragging: false };
        this.primitive.highlight(undefined, 'none');
        if (activeHandle && payload) {
            const ctrlKey = event instanceof PointerEvent ? event.ctrlKey : (_a = event === null || event === void 0 ? void 0 : event.ctrlKey) !== null && _a !== void 0 ? _a : false;
            const shiftKey = event instanceof PointerEvent ? event.shiftKey : (_b = event === null || event === void 0 ? void 0 : event.shiftKey) !== null && _b !== void 0 ? _b : false;
            const finalResult = result !== null && result !== void 0 ? result : this.solver.solve(this.state.frame, payload, this.snapConfigs[activeHandle.mode], {
                ctrlKey,
                shiftKey
            });
            this.emit({ type: 'drag-end', handle: activeHandle, payload, result: finalResult, cancelled });
        }
    }
    emit(event) {
        this.listeners.forEach((listener) => listener(event));
    }
    windowPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: rect.height - (event.clientY - rect.top)
        };
    }
    computePayload(handle, frame, position, initial) {
        const camera = this.scene.camera;
        const pickRay = camera.getPickRay(new Cesium.Cartesian2(position.x, position.y));
        if (!pickRay) {
            return undefined;
        }
        const rayOrigin = vectorFromCartesian(pickRay.origin);
        const rayDirection = vectorFromCartesian(pickRay.direction).normalize();
        const cameraDirection = vectorFromCartesian(camera.direction).normalize();
        const intersection = this.intersect(handle, frame, rayOrigin, rayDirection, cameraDirection, initial);
        if (!intersection) {
            return undefined;
        }
        return {
            mode: handle.mode,
            axis: handle.axis,
            planeNormal: intersection.planeNormal,
            initialRay: initial
                ? { origin: initial, direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z } }
                : { origin: intersection.point, direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z } },
            currentRay: { origin: intersection.point, direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z } }
        };
    }
    intersect(handle, frame, rayOrigin, rayDirection, cameraDirection, initial) {
        const axisVector = handle.axis ? frame.axes[handle.axis].clone().normalize() : undefined;
        const origin = frame.origin.clone();
        if (handle.mode === 'translate' || handle.mode === 'scale') {
            if (axisVector) {
                let planeNormal = axisVector.clone().cross(cameraDirection).cross(axisVector);
                if (planeNormal.length() < 1e-6) {
                    planeNormal = frame.axes.y.clone().cross(axisVector);
                }
                if (planeNormal.length() < 1e-6) {
                    planeNormal = frame.axes.z.clone().cross(axisVector);
                }
                planeNormal.normalize();
                const t = intersectRayPlane(rayOrigin, rayDirection, origin, planeNormal);
                if (t === undefined) {
                    return undefined;
                }
                const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
                return { point: toValues(point), planeNormal: toValues(planeNormal) };
            }
            // uniform scale / free translate fallback to plane facing camera
            const planeNormal = cameraDirection.clone().normalize();
            const t = intersectRayPlane(rayOrigin, rayDirection, origin, planeNormal);
            if (t === undefined) {
                return undefined;
            }
            const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
            return { point: toValues(point), planeNormal: toValues(planeNormal) };
        }
        if (handle.mode === 'rotate') {
            const normal = axisVector !== null && axisVector !== void 0 ? axisVector : cameraDirection.clone().normalize();
            const t = intersectRayPlane(rayOrigin, rayDirection, origin, normal);
            if (t === undefined) {
                return undefined;
            }
            const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
            return { point: toValues(point), planeNormal: toValues(normal) };
        }
        return undefined;
    }
}
function toValues(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
}
function vectorFromCartesian(cartesian) {
    return new Vector3(cartesian.x, cartesian.y, cartesian.z);
}
function intersectRayPlane(rayOrigin, rayDirection, planePoint, planeNormal) {
    const denom = planeNormal.dot(rayDirection);
    if (Math.abs(denom) < 1e-6) {
        return undefined;
    }
    const t = planePoint.clone().subtract(rayOrigin).dot(planeNormal) / denom;
    if (t < 0) {
        return undefined;
    }
    return t;
}
