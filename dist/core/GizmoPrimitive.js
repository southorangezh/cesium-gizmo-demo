const AXIS_COLOR = {
    x: () => Cesium.Color.RED,
    y: () => Cesium.Color.GREEN,
    z: () => Cesium.Color.BLUE
};
const ACTIVE_MULTIPLIER = 1.6;
const HOVER_MULTIPLIER = 1.2;
export class GizmoPrimitive {
    constructor(scene) {
        this.handles = new Map();
        this.visible = true;
        this.modeVisibility = {
            translate: true,
            rotate: true,
            scale: true
        };
        this.scene = scene;
        this.root = new Cesium.PrimitiveCollection();
        this.axisLines = new Cesium.PolylineCollection();
        this.points = new Cesium.PointPrimitiveCollection();
        this.rings = new Cesium.PolylineCollection();
        this.root.add(this.axisLines);
        this.root.add(this.points);
        this.root.add(this.rings);
        this.scene.primitives.add(this.root);
        this.buildHandles();
        this.applyVisibility();
    }
    getHandle(id) {
        return this.handles.get(id);
    }
    getHandleIds() {
        return Array.from(this.handles.keys());
    }
    buildHandles() {
        this.createTranslateHandles();
        this.createScaleHandles();
        this.createRotationRings();
    }
    createTranslateHandles() {
        ['x', 'y', 'z'].forEach((axis) => {
            const polyline = this.axisLines.add({
                positions: [Cesium.Cartesian3.ZERO, Cesium.Cartesian3.UNIT_X],
                width: 6,
                material: new Cesium.PolylineOutlineMaterialProperty({
                    color: AXIS_COLOR[axis](),
                    outlineWidth: 0,
                    outlineColor: AXIS_COLOR[axis]()
                })
            });
            polyline.id = `translate-${axis}`;
            this.handles.set(polyline.id, {
                id: polyline.id,
                mode: 'translate',
                axis,
                type: 'axis',
                color: AXIS_COLOR[axis](),
                highlightColor: AXIS_COLOR[axis]().brighten(HOVER_MULTIPLIER, new Cesium.Color()),
                activeColor: AXIS_COLOR[axis]().brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
                primitive: polyline
            });
        });
    }
    createScaleHandles() {
        ['x', 'y', 'z'].forEach((axis) => {
            const point = this.points.add({
                position: Cesium.Cartesian3.ZERO,
                color: AXIS_COLOR[axis](),
                pixelSize: 14,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            });
            point.id = `scale-${axis}`;
            this.handles.set(point.id, {
                id: point.id,
                mode: 'scale',
                axis,
                type: 'axis',
                color: AXIS_COLOR[axis](),
                highlightColor: AXIS_COLOR[axis]().brighten(HOVER_MULTIPLIER, new Cesium.Color()),
                activeColor: AXIS_COLOR[axis]().brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
                primitive: point
            });
        });
        const uniform = this.points.add({
            position: Cesium.Cartesian3.ZERO,
            color: Cesium.Color.WHITE,
            pixelSize: 16,
            outlineColor: Cesium.Color.GRAY,
            outlineWidth: 2
        });
        uniform.id = 'scale-uniform';
        this.handles.set(uniform.id, {
            id: uniform.id,
            mode: 'scale',
            type: 'uniform',
            color: Cesium.Color.WHITE,
            highlightColor: Cesium.Color.WHITE.brighten(HOVER_MULTIPLIER, new Cesium.Color()),
            activeColor: Cesium.Color.WHITE.brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
            primitive: uniform
        });
    }
    createRotationRings() {
        const axes = ['x', 'y', 'z', 'view'];
        axes.forEach((axis) => {
            const polyline = this.rings.add({
                positions: [],
                width: 3,
                material: new Cesium.PolylineOutlineMaterialProperty({
                    color: axis === 'view' ? Cesium.Color.WHITE : AXIS_COLOR[axis](),
                    outlineWidth: 0,
                    outlineColor: axis === 'view' ? Cesium.Color.WHITE : AXIS_COLOR[axis]()
                })
            });
            const id = axis === 'view' ? 'rotate-view' : `rotate-${axis}`;
            polyline.id = id;
            const baseColor = axis === 'view' ? Cesium.Color.WHITE : AXIS_COLOR[axis]();
            this.handles.set(id, {
                id,
                mode: 'rotate',
                axis: axis === 'view' ? undefined : axis,
                type: 'ring',
                color: baseColor,
                highlightColor: baseColor.brighten(HOVER_MULTIPLIER, new Cesium.Color()),
                activeColor: baseColor.brighten(ACTIVE_MULTIPLIER, new Cesium.Color()),
                primitive: polyline
            });
        });
    }
    update(frame, size, cameraPosition) {
        const scale = this.computeScale(frame.origin, cameraPosition, size);
        this.updateTranslateHandles(frame, scale);
        this.updateScaleHandles(frame, scale);
        this.updateRotationRings(frame, scale, cameraPosition);
    }
    setVisible(visible) {
        this.visible = visible;
        this.applyVisibility();
    }
    setModeEnabled(mode, enabled) {
        this.modeVisibility[mode] = enabled;
        this.handles.forEach((handle) => {
            if (handle.mode === mode) {
                if (handle.primitive.show !== undefined) {
                    handle.primitive.show = enabled;
                }
                if (handle.primitive.material) {
                    handle.primitive.material.show = enabled;
                }
            }
        });
    }
    highlight(handleId, state) {
        this.handles.forEach((handle) => {
            var _a;
            const material = (_a = handle.primitive.material) !== null && _a !== void 0 ? _a : handle.primitive;
            const color = this.resolveColor(handle, handle.id === handleId ? state : 'none');
            if (handle.type === 'ring' || handle.type === 'axis') {
                if (material && material.color) {
                    material.color = color;
                }
                if (handle.primitive.color) {
                    handle.primitive.color = color;
                }
            }
            else if (handle.type === 'uniform') {
                handle.primitive.color = color;
            }
        });
    }
    destroy() {
        if (!this.root.isDestroyed()) {
            this.scene.primitives.remove(this.root);
            this.root.destroy();
        }
        this.handles.clear();
    }
    applyVisibility() {
        this.root.show = this.visible;
    }
    updateTranslateHandles(frame, scale) {
        ['x', 'y', 'z'].forEach((axis) => {
            const handle = this.handles.get(`translate-${axis}`);
            if (!handle) {
                return;
            }
            const direction = frame.axes[axis].clone().normalize();
            const start = frame.origin.clone();
            const end = frame.origin.clone().add(direction.multiplyScalar(scale));
            handle.primitive.positions = [toCartesian(start), toCartesian(end)];
        });
    }
    updateScaleHandles(frame, scale) {
        const uniform = this.handles.get('scale-uniform');
        if (uniform) {
            uniform.primitive.position = toCartesian(frame.origin);
            uniform.primitive.pixelSize = Math.max(12, scale * 8);
        }
        ['x', 'y', 'z'].forEach((axis) => {
            const handle = this.handles.get(`scale-${axis}`);
            if (!handle) {
                return;
            }
            const direction = frame.axes[axis].clone().normalize();
            const position = frame.origin.clone().add(direction.multiplyScalar(scale));
            handle.primitive.position = toCartesian(position);
            handle.primitive.pixelSize = Math.max(12, scale * 6);
        });
    }
    updateRotationRings(frame, scale, cameraPosition) {
        const segments = 64;
        const radius = scale * 1.2;
        ['x', 'y', 'z'].forEach((axis) => {
            const handle = this.handles.get(`rotate-${axis}`);
            if (!handle) {
                return;
            }
            const axisVector = frame.axes[axis].clone().normalize();
            const basis = this.rotationBasis(axisVector, frame, axis);
            const positions = [];
            for (let i = 0; i <= segments; i += 1) {
                const t = (i / segments) * Math.PI * 2;
                const radial = basis.u.clone().multiplyScalar(Math.cos(t)).add(basis.v.clone().multiplyScalar(Math.sin(t)));
                const point = frame.origin.clone().add(radial.multiplyScalar(radius));
                positions.push(toCartesian(point));
            }
            handle.primitive.positions = positions;
        });
        const viewHandle = this.handles.get('rotate-view');
        if (viewHandle) {
            const viewDir = cameraPosition.clone().subtract(frame.origin).normalize();
            const basis = this.rotationBasis(viewDir, frame, 'z');
            const positions = [];
            for (let i = 0; i <= segments; i += 1) {
                const t = (i / segments) * Math.PI * 2;
                const radial = basis.u.clone().multiplyScalar(Math.cos(t)).add(basis.v.clone().multiplyScalar(Math.sin(t)));
                const point = frame.origin.clone().add(radial.multiplyScalar(radius * 1.1));
                positions.push(toCartesian(point));
            }
            viewHandle.primitive.positions = positions;
        }
    }
    rotationBasis(axis, frame, fallbackAxis) {
        let u;
        let v;
        if (fallbackAxis === 'x') {
            u = frame.axes.y.clone().normalize();
            v = frame.axes.z.clone().normalize();
        }
        else if (fallbackAxis === 'y') {
            u = frame.axes.x.clone().normalize();
            v = frame.axes.z.clone().normalize();
        }
        else {
            u = frame.axes.x.clone().normalize();
            v = frame.axes.y.clone().normalize();
        }
        u = u.projectOnPlane(axis);
        if (u.length() < 1e-6) {
            u = frame.axes.y.clone().projectOnPlane(axis);
        }
        u.normalize();
        v = axis.clone().cross(u).normalize();
        return { u, v };
    }
    computeScale(origin, cameraPosition, size) {
        const distance = origin.distanceTo(cameraPosition);
        const base = size.radius;
        const scale = Math.min(Math.max(distance * 0.1, size.minScale), size.maxScale);
        return Math.max(base, scale);
    }
    resolveColor(handle, state) {
        switch (state) {
            case 'hover':
                return handle.highlightColor;
            case 'active':
                return handle.activeColor;
            default:
                return handle.color;
        }
    }
}
function toCartesian(vector) {
    return new Cesium.Cartesian3(vector.x, vector.y, vector.z);
}
