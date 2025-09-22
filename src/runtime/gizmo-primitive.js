import { vec3, add, scale as scaleVec, toCesium as toCartesian } from '../math/vec3.js';

const AXIS_COLORS = {
  x: [1, 0.2, 0.2, 1],
  y: [0.2, 1, 0.2, 1],
  z: [0.2, 0.6, 1, 1],
  view: [1, 1, 1, 1],
};

const HANDLE_DEFINITIONS = [
  { id: 'translate-x', mode: 'translate', axis: 'x', type: 'axis' },
  { id: 'translate-y', mode: 'translate', axis: 'y', type: 'axis' },
  { id: 'translate-z', mode: 'translate', axis: 'z', type: 'axis' },
  { id: 'translate-xy', mode: 'translate', axisPair: ['x', 'y'], type: 'plane' },
  { id: 'translate-yz', mode: 'translate', axisPair: ['y', 'z'], type: 'plane' },
  { id: 'translate-xz', mode: 'translate', axisPair: ['x', 'z'], type: 'plane' },
  { id: 'rotate-x', mode: 'rotate', axis: 'x', type: 'ring' },
  { id: 'rotate-y', mode: 'rotate', axis: 'y', type: 'ring' },
  { id: 'rotate-z', mode: 'rotate', axis: 'z', type: 'ring' },
  { id: 'rotate-view', mode: 'rotate', type: 'viewRing' },
  { id: 'scale-x', mode: 'scale', axis: 'x', type: 'axis' },
  { id: 'scale-y', mode: 'scale', axis: 'y', type: 'axis' },
  { id: 'scale-z', mode: 'scale', axis: 'z', type: 'axis' },
  { id: 'scale-uniform', mode: 'scale', type: 'uniform' },
];

function colorFromArray(arr) {
  const Cesium = globalThis.Cesium;
  if (!Cesium) {
    return arr;
  }
  return new Cesium.Color(arr[0], arr[1], arr[2], arr[3]);
}

export class GizmoPrimitive {
  constructor(viewer) {
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.entities = [];
    this.show = true;
    this.activeId = null;
    this.hoverId = null;
    this.size = {
      axisLength: 1,
      planeSize: 0.5,
      ringRadius: 1.2,
      scaleBoxSize: 0.1,
    };
    this.collection = viewer.entities;
    this._build();
  }

  _build() {
    for (const def of HANDLE_DEFINITIONS) {
      const entity = this._createEntity(def);
      entity.show = this.show;
      this.entities.push({ def, entity });
    }
  }

  _createEntity(def) {
    const Cesium = globalThis.Cesium;
    if (!Cesium) {
      throw new Error('Cesium is required to render GizmoPrimitive.');
    }
    const color = colorFromArray(AXIS_COLORS[def.axis || 'view']);
    const entityOptions = {
      id: `gizmo-${def.id}`,
      show: this.show,
      allowPicking: true,
      gizmo: {
        id: def.id,
        mode: def.mode,
        axis: def.axis,
        axisPair: def.axisPair || null,
        type: def.type,
      },
      position: Cesium.Cartesian3.ZERO,
      orientation: Cesium.Quaternion.IDENTITY,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    };
    if (def.type === 'axis') {
      entityOptions.polyline = new Cesium.PolylineGraphics({
        positions: [Cesium.Cartesian3.ZERO, Cesium.Cartesian3.UNIT_X],
        width: 4,
        material: color,
        depthFailMaterial: color,
        clampToGround: false,
      });
    } else if (def.type === 'plane') {
      entityOptions.polygon = new Cesium.PolygonGraphics({
        hierarchy: new Cesium.PolygonHierarchy([
          Cesium.Cartesian3.ZERO,
          Cesium.Cartesian3.UNIT_X,
          Cesium.Cartesian3.add(Cesium.Cartesian3.UNIT_X, Cesium.Cartesian3.UNIT_Y, new Cesium.Cartesian3()),
          Cesium.Cartesian3.UNIT_Y,
        ]),
        material: color.withAlpha ? color.withAlpha(0.25) : color,
        height: 0,
        perPositionHeight: true,
      });
    } else if (def.type === 'ring' || def.type === 'viewRing') {
      entityOptions.polyline = new Cesium.PolylineGraphics({
        positions: [],
        width: 3,
        material: color,
        clampToGround: false,
      });
    } else if (def.type === 'uniform') {
      entityOptions.box = new Cesium.BoxGraphics({
        dimensions: new Cesium.Cartesian3(0.2, 0.2, 0.2),
        material: colorFromArray([1, 1, 1, 1]),
        outline: true,
        outlineColor: colorFromArray([0.2, 0.2, 0.2, 1]),
        show: true,
      });
    }
    return this.collection.add(entityOptions);
  }

  setVisible(show) {
    this.show = show;
    for (const { entity } of this.entities) {
      entity.show = show;
    }
  }

  setSize(size) {
    Object.assign(this.size, size);
  }

  update(frame, pixelScale) {
    const Cesium = globalThis.Cesium;
    if (!Cesium) {
      return;
    }
    const origin = toCartesian(frame.origin);
    const basis = frame.basis;
    const axisLength = this.size.axisLength * pixelScale;
    const planeSize = this.size.planeSize * pixelScale;
    const ringRadius = this.size.ringRadius * pixelScale;
    const scaleBoxSize = this.size.scaleBoxSize * pixelScale;

    for (const { def, entity } of this.entities) {
      entity.position = origin;
      entity.show = this.show;
      if (!this.show) {
        continue;
      }
      if (def.type === 'axis') {
        const axis = basis[def.axis];
        const end = add(frame.origin, scaleVec(axis, axisLength));
        entity.polyline.positions = [origin, toCartesian(end)];
      } else if (def.type === 'plane') {
        const axisA = basis[def.axisPair[0]];
        const axisB = basis[def.axisPair[1]];
        const p1 = toCartesian(add(frame.origin, scaleVec(axisA, planeSize)));
        const p2 = toCartesian(add(frame.origin, add(scaleVec(axisA, planeSize), scaleVec(axisB, planeSize))));
        const p3 = toCartesian(add(frame.origin, scaleVec(axisB, planeSize)));
        entity.polygon.hierarchy = new Cesium.PolygonHierarchy([origin, p1, p2, p3]);
      } else if (def.type === 'ring') {
        const axis = basis[def.axis];
        const circle = generateCircle(frame.origin, axis, ringRadius, 64, frame);
        entity.polyline.positions = circle.map(toCartesian);
      } else if (def.type === 'viewRing') {
        const normal = this.scene.camera.direction;
        const circle = generateCircle(frame.origin, normal, ringRadius * 1.1, 64, frame);
        entity.polyline.positions = circle.map(toCartesian);
      } else if (def.type === 'uniform') {
        entity.box.dimensions = new Cesium.Cartesian3(scaleBoxSize, scaleBoxSize, scaleBoxSize);
      }
    }
  }

  highlight(handleId) {
    this.hoverId = handleId;
    this._applyState();
  }

  activate(handleId) {
    this.activeId = handleId;
    this._applyState();
  }

  clearStates() {
    this.hoverId = null;
    this.activeId = null;
    this._applyState();
  }

  _applyState() {
    const hoverColor = colorFromArray([1, 1, 1, 1]);
    const activeColor = colorFromArray([1, 0.8, 0.2, 1]);
    for (const { def, entity } of this.entities) {
      const baseColor = colorFromArray(AXIS_COLORS[def.axis || 'view']);
      const stateColor = def.id === this.activeId ? activeColor : def.id === this.hoverId ? hoverColor : baseColor;
      if (entity.polyline) {
        entity.polyline.material = stateColor;
        entity.polyline.width = def.id === this.activeId ? 6 : 4;
      }
      if (entity.box) {
        entity.box.material = stateColor;
      }
      if (entity.polygon && entity.polygon.material && entity.polygon.material.color) {
        entity.polygon.material.color = stateColor.withAlpha ? stateColor.withAlpha(0.3) : stateColor;
      }
    }
  }

  destroy() {
    for (const { entity } of this.entities) {
      this.collection.remove(entity);
    }
    this.entities = [];
  }
}

function generateCircle(origin, normal, radius, segments, frame) {
  const tangent = frame && frame.basis ? frame.basis.x : vec3(1, 0, 0);
  const bitangent = frame && frame.basis ? frame.basis.y : vec3(0, 1, 0);
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const point = add(origin, add(scaleVec(tangent, radius * cos), scaleVec(bitangent, radius * sin)));
    points.push(point);
  }
  return points;
}
