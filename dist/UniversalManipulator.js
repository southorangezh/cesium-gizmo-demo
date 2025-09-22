import { FrameBuilder } from './core/FrameBuilder.js';
import { GizmoPrimitive } from './core/GizmoPrimitive.js';
import { GizmoPicker } from './core/GizmoPicker.js';
import { ManipulatorController } from './core/ManipulatorController.js';
import { TransformSolver } from './core/TransformSolver.js';
import { Snapper } from './core/Snapper.js';
import { PivotResolver } from './core/PivotResolver.js';
import { HudOverlay } from './core/HudOverlay.js';
import { Vector3 } from './math/Vector3.js';
import { Matrix4 } from './math/Matrix4.js';
import { Quaternion } from './math/Quaternion.js';
import { decomposeMatrix } from './core/utils.js';
export class UniversalManipulator {
    constructor(viewerOrScene, options = {}) {
        var _a, _b, _c, _d;
        this.show = true;
        this.frameBuilder = new FrameBuilder();
        this.pivotResolver = new PivotResolver();
        this.snapper = new Snapper();
        this.targets = [];
        this.orientation = 'global';
        this.pivot = 'origin';
        this.sizeOptions = { radius: 1.5, minScale: 0.8, maxScale: 5000 };
        this.history = [];
        this.historyIndex = -1;
        this.scene = UniversalManipulator.resolveScene(viewerOrScene);
        this.canvas = this.scene.canvas;
        this.container = UniversalManipulator.resolveContainer(viewerOrScene);
        this.primitive = new GizmoPrimitive(this.scene);
        this.picker = new GizmoPicker(this.scene, this.primitive);
        this.solver = new TransformSolver({ snapper: this.snapper });
        this.controller = new ManipulatorController(this.scene, this.canvas, this.picker, this.primitive, this.solver);
        this.hud = new HudOverlay(this.container);
        this.postRenderListener = () => this.refresh();
        this.scene.postRender.addEventListener(this.postRenderListener);
        this.controller.on((event) => {
            switch (event.type) {
                case 'hover':
                    if (event.handle) {
                        this.hud.update({ mode: event.handle.mode, axis: event.handle.axis, active: false });
                    }
                    else {
                        this.hud.update({ mode: 'translate', active: false });
                    }
                    break;
                case 'drag-start':
                    this.captureInitialState();
                    this.hud.update({ mode: event.handle.mode, axis: event.handle.axis, active: true });
                    break;
                case 'drag-update':
                    this.applyDelta(event.result, false);
                    this.hud.update({
                        mode: event.handle.mode,
                        axis: event.handle.axis,
                        deltaTranslation: event.result.deltaTranslation,
                        deltaRotation: deltaEuler(event.result.deltaRotation),
                        deltaScale: event.result.deltaScale,
                        snap: undefined,
                        active: true
                    });
                    break;
                case 'drag-end':
                    if (event.cancelled) {
                        this.restoreInitialState();
                    }
                    else {
                        this.applyDelta(event.result, true);
                        this.commitHistory();
                    }
                    this.hud.update({ mode: event.handle.mode, axis: event.handle.axis, active: false });
                    break;
                default:
                    break;
            }
        });
        if (options.target) {
            this.setTarget(options.target);
        }
        if (options.orientation) {
            this.setOrientation(options.orientation);
        }
        if (options.pivot) {
            this.setPivot(options.pivot);
        }
        if (options.snap) {
            this.setSnap(options.snap);
        }
        if (options.screenScale) {
            this.setSize((_a = options.screenScale.radius) !== null && _a !== void 0 ? _a : this.sizeOptions.radius, (_b = options.screenScale.minScale) !== null && _b !== void 0 ? _b : this.sizeOptions.minScale, (_c = options.screenScale.maxScale) !== null && _c !== void 0 ? _c : this.sizeOptions.maxScale);
        }
        this.setVisible((_d = options.show) !== null && _d !== void 0 ? _d : true);
    }
    setTarget(target) {
        this.targets = Array.isArray(target) ? target.slice() : [target];
        this.refresh();
    }
    setOrientation(orientation) {
        this.orientation = orientation;
        this.refresh();
    }
    setPivot(pivot) {
        this.pivot = pivot;
        this.refresh();
    }
    enable(modes) {
        Object.keys(modes).forEach((mode) => {
            const enabled = modes[mode];
            if (typeof enabled === 'boolean') {
                this.primitive.setModeEnabled(mode, enabled);
            }
            if (this.snapConfig) {
                this.controller.setSnapConfig(mode, this.snapConfig);
            }
        });
    }
    setSnap(config) {
        this.snapConfig = config;
        ['translate', 'rotate', 'scale'].forEach((mode) => {
            this.controller.setSnapConfig(mode, config);
        });
    }
    setSize(radius, minScale, maxScale) {
        this.sizeOptions = { radius, minScale, maxScale };
        this.refresh();
    }
    setVisible(visible) {
        this.show = visible;
        this.primitive.setVisible(visible);
        this.refresh();
    }
    setCursor(position) {
        this.cursor = position.clone();
        this.refresh();
    }
    setNormal(normal) {
        this.normal = normal.clone();
        this.refresh();
    }
    undo() {
        if (this.historyIndex < 0) {
            return;
        }
        const entry = this.history[this.historyIndex];
        this.historyIndex -= 1;
        this.applyMatrixMap(entry.before);
    }
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            return;
        }
        this.historyIndex += 1;
        const entry = this.history[this.historyIndex];
        this.applyMatrixMap(entry.after);
    }
    destroy() {
        this.scene.postRender.removeEventListener(this.postRenderListener);
        this.controller.destroy();
        this.primitive.destroy();
        this.hud.destroy();
    }
    refresh() {
        var _a, _b;
        if (this.targets.length === 0) {
            this.primitive.setVisible(false);
            return;
        }
        this.primitive.setVisible(this.show);
        this.pivotResult = this.pivotResolver.resolve(this.pivot, this.targets, { cursor: this.cursor });
        const pivotPoint = this.pivotResult.pivotPoint;
        const frameOptions = {
            targets: this.targets,
            orientation: this.orientation,
            pivot: this.pivot,
            pivotPoint,
            camera: {
                position: vectorFromCartesian((_a = this.scene.camera.positionWC) !== null && _a !== void 0 ? _a : this.scene.camera.position),
                direction: vectorFromCartesian(this.scene.camera.direction),
                up: vectorFromCartesian(this.scene.camera.up)
            },
            normal: this.normal
        };
        this.frame = this.frameBuilder.build(frameOptions);
        this.controller.setFrame(this.frame);
        const cameraPosition = vectorFromCartesian((_b = this.scene.camera.positionWC) !== null && _b !== void 0 ? _b : this.scene.camera.position);
        this.primitive.update(this.frame, this.sizeOptions, cameraPosition);
    }
    captureInitialState() {
        const map = new Map();
        this.targets.forEach((target) => {
            map.set(target.id, target.matrix.slice());
        });
        this.pendingInitial = map;
    }
    restoreInitialState() {
        if (!this.pendingInitial) {
            return;
        }
        this.applyMatrixMap(this.pendingInitial);
        this.pendingInitial = undefined;
    }
    commitHistory() {
        if (!this.pendingInitial) {
            return;
        }
        const after = new Map();
        this.targets.forEach((target) => after.set(target.id, target.matrix.slice()));
        const entry = { before: this.pendingInitial, after };
        this.history.splice(this.historyIndex + 1);
        this.history.push(entry);
        this.historyIndex = this.history.length - 1;
        this.pendingInitial = undefined;
    }
    applyMatrixMap(map) {
        this.targets.forEach((target) => {
            const matrix = map.get(target.id);
            if (matrix) {
                target.matrix = matrix.slice();
            }
        });
        this.refresh();
    }
    applyDelta(result, commit) {
        if (!this.frame || !this.pivotResult || !this.pendingInitial) {
            return;
        }
        const pivotPoint = this.pivotResult.pivotPoint;
        const deltaTranslation = new Vector3(result.deltaTranslation.x, result.deltaTranslation.y, result.deltaTranslation.z);
        const deltaRotation = new Quaternion(result.deltaRotation.x, result.deltaRotation.y, result.deltaRotation.z, result.deltaRotation.w);
        const deltaScale = result.deltaScale;
        this.targets.forEach((target) => {
            var _a;
            const initialMatrix = this.pendingInitial.get(target.id);
            if (!initialMatrix) {
                return;
            }
            const trs = decomposeMatrix(initialMatrix);
            const pivotForTarget = this.pivotResult.individual && ((_a = this.pivotResult.perTarget) === null || _a === void 0 ? void 0 : _a.get(target.id))
                ? this.pivotResult.perTarget.get(target.id)
                : pivotPoint;
            const relative = trs.translation.clone().subtract(pivotForTarget);
            const local = new Vector3(relative.dot(this.frame.axes.x), relative.dot(this.frame.axes.y), relative.dot(this.frame.axes.z));
            local.x *= deltaScale.x;
            local.y *= deltaScale.y;
            local.z *= deltaScale.z;
            let worldRelative = this.frame.axes.x.clone().multiplyScalar(local.x)
                .add(this.frame.axes.y.clone().multiplyScalar(local.y))
                .add(this.frame.axes.z.clone().multiplyScalar(local.z));
            worldRelative = deltaRotation.rotateVector(worldRelative);
            const position = pivotForTarget.clone().add(worldRelative).add(deltaTranslation);
            const rotation = deltaRotation.clone().multiply(trs.rotation.clone()).normalize();
            const scale = trs.scale.clone();
            scale.x *= deltaScale.x;
            scale.y *= deltaScale.y;
            scale.z *= deltaScale.z;
            const matrix = new Matrix4().compose(position, rotation, scale);
            target.matrix = matrix.elements.slice();
        });
        if (commit) {
            this.refresh();
        }
    }
    static resolveScene(viewerOrScene) {
        if (viewerOrScene.scene) {
            return viewerOrScene.scene;
        }
        return viewerOrScene;
    }
    static resolveContainer(viewerOrScene) {
        if (viewerOrScene.container) {
            return viewerOrScene.container;
        }
        if (viewerOrScene.canvas && viewerOrScene.canvas.parentElement) {
            return viewerOrScene.canvas.parentElement;
        }
        throw new Error('Unable to determine container element for manipulator HUD');
    }
}
function vectorFromCartesian(cartesian) {
    return new Vector3(cartesian.x, cartesian.y, cartesian.z);
}
function deltaEuler(quaternion) {
    const q = new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w).normalize();
    const matrix = new Matrix4().makeRotationFromQuaternion(q);
    const m = matrix.elements;
    let x;
    let y;
    let z;
    if (Math.abs(m[6]) < 0.99999) {
        y = Math.asin(-m[6]);
        x = Math.atan2(m[7], m[8]);
        z = Math.atan2(m[4], m[0]);
    }
    else {
        y = Math.asin(-m[6]);
        x = Math.atan2(-m[9], m[5]);
        z = 0;
    }
    return { x, y, z };
}
