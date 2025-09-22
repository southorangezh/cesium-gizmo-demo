export class GizmoPicker {
    constructor(scene, primitive) {
        this.scene = scene;
        this.primitive = primitive;
    }
    pick(options) {
        var _a;
        const picked = this.scene.pick(new Cesium.Cartesian2(options.windowPosition.x, options.windowPosition.y));
        if (!picked || !picked.id) {
            return undefined;
        }
        const id = (_a = picked.id.id) !== null && _a !== void 0 ? _a : picked.id;
        const handle = this.primitive.getHandle(id);
        if (!handle) {
            return undefined;
        }
        return {
            id: handle.id,
            mode: handle.mode,
            axis: handle.axis,
            type: handle.type,
            priority: this.priority(handle.mode, handle.type),
            screenPosition: options.windowPosition
        };
    }
    priority(mode, type) {
        const base = mode === 'translate' ? 100 : mode === 'rotate' ? 80 : 60;
        const typeWeight = type === 'axis' ? 3 : type === 'ring' ? 2 : 1;
        return base + typeWeight;
    }
}
