import {
  UniversalManipulator,
  createPerspectiveCamera,
  MatrixTransformTarget,
  Matrix4,
  Quaternion,
  Vector3,
  Orientation,
  Pivot,
  updateCameraViewport
} from '../src/index.js';
import { projectToScreen } from '../src/core/projection.js';
import { Matrix3 } from '../src/math/Matrix3.js';

class SceneRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly container: HTMLElement, private readonly camera: ReturnType<typeof createPerspectiveCamera>) {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to obtain 2D context.');
    }
    this.context = ctx;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.container.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    updateCameraViewport(this.camera, rect.width, rect.height);
  }

  render(matrix: Matrix4): void {
    this.resize();
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const origin = matrix.getTranslation(new Vector3());
    const rotation = matrix.getRotation(new Matrix3());
    const axes = [
      { dir: new Vector3(rotation.elements[0], rotation.elements[1], rotation.elements[2]), color: '#ff5555' },
      { dir: new Vector3(rotation.elements[3], rotation.elements[4], rotation.elements[5]), color: '#55ff55' },
      { dir: new Vector3(rotation.elements[6], rotation.elements[7], rotation.elements[8]), color: '#5599ff' }
    ];
    const axisLength = 10;
    const originScreen = projectToScreen(this.camera, origin);
    if (!originScreen) {
      return;
    }
    for (const axis of axes) {
      const endWorld = Vector3.add(origin, Vector3.multiplyByScalar(axis.dir, axisLength, new Vector3()), new Vector3());
      const endScreen = projectToScreen(this.camera, endWorld);
      if (!endScreen) {
        continue;
      }
      ctx.beginPath();
      ctx.strokeStyle = axis.color;
      ctx.lineWidth = 2;
      ctx.moveTo(originScreen.x, originScreen.y);
      ctx.lineTo(endScreen.x, endScreen.y);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(originScreen.x, originScreen.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function setupControls(manipulator: UniversalManipulator): void {
  const orientationSelect = document.getElementById('orientation') as HTMLSelectElement;
  const pivotSelect = document.getElementById('pivot') as HTMLSelectElement;
  const undoButton = document.getElementById('undo') as HTMLButtonElement;
  const redoButton = document.getElementById('redo') as HTMLButtonElement;

  orientationSelect.addEventListener('change', () => {
    manipulator.setOrientation(orientationSelect.value as Orientation);
  });

  pivotSelect.addEventListener('change', () => {
    manipulator.setPivot(pivotSelect.value as Pivot);
  });

  undoButton.addEventListener('click', () => manipulator.undo());
  redoButton.addEventListener('click', () => manipulator.redo());
}

function main(): void {
  const container = document.getElementById('scene') as HTMLElement;
  const rect = container.getBoundingClientRect();
  const camera = createPerspectiveCamera({
    position: new Vector3(30, 30, 30),
    lookAt: new Vector3(0, 0, 0),
    viewportWidth: rect.width,
    viewportHeight: rect.height,
    aspect: rect.width / rect.height
  });

  const baseMatrix = Matrix4.fromTranslationRotationScale(
    new Vector3(0, 0, 0),
    Quaternion.identity(),
    new Vector3(1, 1, 1)
  );
  const target = new MatrixTransformTarget(baseMatrix);

  const manipulator = new UniversalManipulator(
    {
      target,
      orientation: 'global',
      pivot: 'origin',
      enableTranslate: true,
      enableRotate: true,
      enableScale: true,
      snap: {
        translate: 1,
        rotate: (5 * Math.PI) / 180,
        scale: 0.1,
        fineModifier: 0.2,
        coarseModifier: 5
      }
    },
    { camera, container }
  );

  const renderer = new SceneRenderer(container, camera);
  renderer.render(target.getMatrix());

  setupControls(manipulator);

  const renderLoop = () => {
    renderer.render(target.getMatrix());
    requestAnimationFrame(renderLoop);
  };
  renderLoop();
}

window.addEventListener('DOMContentLoaded', main);
