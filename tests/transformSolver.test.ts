import { describe, it, expect } from 'vitest';
import { Cartesian3, Matrix4, Quaternion } from 'cesium';
import { UniversalSnapper } from '@/lib/Snapper';
import { TransformSolver } from '@/lib/TransformSolver';
import type { Frame, SolveRequest, TransformState } from '@/lib/types';

const snapper = new UniversalSnapper({ translate: 0, rotate: 0, scale: 0 });
const solver = new TransformSolver(snapper);

function createFrame(): Frame {
  return {
    origin: new Cartesian3(0, 0, 0),
    axes: {
      x: new Cartesian3(1, 0, 0),
      y: new Cartesian3(0, 1, 0),
      z: new Cartesian3(0, 0, 1)
    },
    matrix: Matrix4.IDENTITY
  };
}

function createState(): TransformState {
  return {
    translation: new Cartesian3(0, 0, 0),
    rotation: Quaternion.IDENTITY,
    scale: new Cartesian3(1, 1, 1),
    matrix: Matrix4.IDENTITY
  };
}

describe('TransformSolver translate', () => {
  it('translates along axis', () => {
    const request: SolveRequest = {
      mode: 'translate',
      axis: 'x',
      frame: createFrame(),
      pivot: new Cartesian3(0, 0, 0),
      pointer: {
        rayOrigin: new Cartesian3(1, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      startPointer: {
        rayOrigin: new Cartesian3(0, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      snapper,
      initialState: createState(),
      cameraDirection: new Cartesian3(0, 0, -1)
    };

    const result = solver.solve(request);
    expect(result.delta.translation.x).toBeCloseTo(1, 5);
    expect(result.delta.translation.y).toBeCloseTo(0, 5);
    expect(result.delta.translation.z).toBeCloseTo(0, 5);
  });

  it('translates on plane', () => {
    const request: SolveRequest = {
      mode: 'translate',
      plane: ['x', 'y'],
      frame: createFrame(),
      pivot: new Cartesian3(0, 0, 0),
      pointer: {
        rayOrigin: new Cartesian3(1, 1, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      startPointer: {
        rayOrigin: new Cartesian3(0, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      snapper,
      initialState: createState(),
      cameraDirection: new Cartesian3(0, 0, -1)
    };

    const result = solver.solve(request);
    expect(result.delta.translation.x).toBeCloseTo(1, 5);
    expect(result.delta.translation.y).toBeCloseTo(1, 5);
    expect(result.delta.translation.z).toBeCloseTo(0, 5);
  });
});

describe('TransformSolver rotate', () => {
  it('rotates around axis', () => {
    const request: SolveRequest = {
      mode: 'rotate',
      axis: 'z',
      frame: createFrame(),
      pivot: new Cartesian3(0, 0, 0),
      pointer: {
        rayOrigin: new Cartesian3(0, 1, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      startPointer: {
        rayOrigin: new Cartesian3(1, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      snapper,
      initialState: createState(),
      cameraDirection: new Cartesian3(0, 0, -1)
    };

    const result = solver.solve(request);
    const q = result.delta.rotation;
    const angle = 2 * Math.acos(q.w);
    expect(angle).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('TransformSolver scale', () => {
  it('scales along axis', () => {
    const request: SolveRequest = {
      mode: 'scale',
      axis: 'x',
      frame: createFrame(),
      pivot: new Cartesian3(0, 0, 0),
      pointer: {
        rayOrigin: new Cartesian3(1, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      startPointer: {
        rayOrigin: new Cartesian3(0, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      snapper,
      initialState: createState(),
      cameraDirection: new Cartesian3(0, 0, -1)
    };

    const result = solver.solve(request);
    expect(result.delta.scale.x).toBeCloseTo(2, 5);
    expect(result.delta.scale.y).toBeCloseTo(1, 5);
  });

  it('scales uniformly', () => {
    const request: SolveRequest = {
      mode: 'scale',
      frame: createFrame(),
      pivot: new Cartesian3(0, 0, 0),
      pointer: {
        rayOrigin: new Cartesian3(0, 0, 5),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      startPointer: {
        rayOrigin: new Cartesian3(0, 0, 10),
        rayDirection: new Cartesian3(0, 0, -1),
        windowPosition: { x: 0, y: 0 }
      },
      snapper,
      initialState: createState(),
      cameraDirection: new Cartesian3(0, 0, -1)
    };

    const result = solver.solve(request);
    expect(result.delta.scale.x).toBeCloseTo(0.5, 5);
    expect(result.delta.scale.y).toBeCloseTo(0.5, 5);
    expect(result.delta.scale.z).toBeCloseTo(0.5, 5);
  });
});
