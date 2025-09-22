import { TransformSolver } from '../src/core/TransformSolver.js';
import { FrameState, TransformSession } from '../src/core/types.js';
import { Snapper } from '../src/core/Snapper.js';
import { Vector3 } from '../src/utils/math/Vector3.js';
import { Quaternion } from '../src/utils/math/Quaternion.js';

declare const process: any;

interface TestCase {
  name: string;
  fn: () => void;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

function expectVector(actual: [number, number, number], expected: [number, number, number], epsilon = 1e-5): void {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(actual[i] - expected[i]) > epsilon) {
      throw new Error(`Vector mismatch at index ${i}: expected ${expected[i]}, got ${actual[i]}`);
    }
  }
}

function expectQuaternion(actual: [number, number, number, number], expected: [number, number, number, number], epsilon = 1e-5): void {
  const direct = actual.every((value, index) => Math.abs(value - expected[index]) <= epsilon);
  if (direct) {
    return;
  }
  const negated = actual.every((value, index) => Math.abs(value + expected[index]) <= epsilon);
  if (!negated) {
    throw new Error(`Quaternion mismatch: expected ${expected} got ${actual}`);
  }
}

function createFrame(): FrameState {
  return {
    pivot: [0, 0, 0],
    axes: {
      x: [1, 0, 0],
      y: [0, 1, 0],
      z: [0, 0, 1]
    },
    matrix: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  };
}

test('axis translation solves correctly', () => {
  const solver = new TransformSolver();
  const session: TransformSession = { mode: 'translate', axis: 'x' };
  const frame = createFrame();
  const snapper = new Snapper();
  solver.begin({
    session,
    frame,
    startRay: {
      origin: new Vector3(0, 0, 5),
      direction: new Vector3(0, 0, -1)
    },
    snapper
  });
  const delta = solver.update({
    currentRay: {
      origin: new Vector3(2, 0, 5),
      direction: new Vector3(0, 0, -1)
    }
  });
  expectVector(delta.translation, [2, 0, 0]);
  expectQuaternion(delta.rotation, [1, 0, 0, 0]);
  expectVector(delta.scale, [1, 1, 1]);
});

test('plane translation solves correctly', () => {
  const solver = new TransformSolver();
  const session: TransformSession = { mode: 'translate', planeAxes: ['x', 'y'] };
  const frame = createFrame();
  const snapper = new Snapper();
  solver.begin({
    session,
    frame,
    startRay: {
      origin: new Vector3(0, 0, 5),
      direction: new Vector3(0, 0, -1)
    },
    snapper
  });
  const delta = solver.update({
    currentRay: {
      origin: new Vector3(3, 4, 5),
      direction: new Vector3(0, 0, -1)
    }
  });
  expectVector(delta.translation, [3, 4, 0]);
});

test('axis rotation solves correctly', () => {
  const solver = new TransformSolver();
  const session: TransformSession = { mode: 'rotate', axis: 'z' };
  const frame = createFrame();
  const snapper = new Snapper();
  solver.begin({
    session,
    frame,
    startRay: {
      origin: new Vector3(1, 0, 5),
      direction: new Vector3(0, 0, -1)
    },
    snapper
  });
  const delta = solver.update({
    currentRay: {
      origin: new Vector3(0, 1, 5),
      direction: new Vector3(0, 0, -1)
    }
  });
  const expectedAngle = Math.PI / 2;
  const expectedQuat = Quaternion.fromAxisAngle(new Vector3(0, 0, 1), expectedAngle);
  expectQuaternion(delta.rotation, [expectedQuat.w, expectedQuat.x, expectedQuat.y, expectedQuat.z]);
});

test('view rotation solves correctly', () => {
  const solver = new TransformSolver();
  const session: TransformSession = {
    mode: 'rotate',
    viewNormal: [0, 0, 1]
  };
  const frame = createFrame();
  const snapper = new Snapper();
  solver.begin({
    session,
    frame,
    startRay: {
      origin: new Vector3(1, 0, 5),
      direction: new Vector3(0, 0, -1)
    },
    snapper
  });
  const delta = solver.update({
    currentRay: {
      origin: new Vector3(0, 1, 5),
      direction: new Vector3(0, 0, -1)
    }
  });
  const expected = Quaternion.fromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
  expectQuaternion(delta.rotation, [expected.w, expected.x, expected.y, expected.z]);
});

test('axis scale solves correctly', () => {
  const solver = new TransformSolver();
  const session: TransformSession = { mode: 'scale', axis: 'x' };
  const frame = createFrame();
  const snapper = new Snapper();
  solver.begin({
    session,
    frame,
    startRay: {
      origin: new Vector3(0, 0, 5),
      direction: new Vector3(0, 0, -1)
    },
    snapper
  });
  const delta = solver.update({
    currentRay: {
      origin: new Vector3(1, 0, 5),
      direction: new Vector3(0, 0, -1)
    }
  });
  expectVector(delta.scale, [2, 1, 1]);
});

async function run(): Promise<void> {
  let passed = 0;
  for (const testCase of tests) {
    try {
      await testCase.fn();
      console.log(`✔ ${testCase.name}`);
      passed++;
    } catch (error) {
      console.error(`✖ ${testCase.name}:`, (error as Error).message);
      process.exitCode = 1;
      break;
    }
  }
  if (process.exitCode && process.exitCode !== 0) {
    throw new Error('Tests failed');
  }
  console.log(`${passed} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
