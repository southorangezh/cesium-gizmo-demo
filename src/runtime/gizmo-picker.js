export class GizmoPicker {
  constructor(scene) {
    this.scene = scene;
  }

  pick(windowPosition) {
    if (!this.scene || !windowPosition) {
      return null;
    }
    const picked = this.scene.pick(windowPosition);
    if (!picked || !picked.id || !picked.id.gizmo) {
      return null;
    }
    const gizmo = picked.id.gizmo;
    return {
      id: gizmo.id,
      mode: gizmo.mode,
      axis: gizmo.axis,
      axisPair: gizmo.axisPair,
      type: gizmo.type,
      position: windowPosition,
    };
  }
}
