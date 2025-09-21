import { CameraState } from './CameraState.js';
import { GizmoPrimitive, HandleGeometry } from './GizmoPrimitive.js';
import { projectToScreen } from './projection.js';
import { Vector3 } from '../math/Vector3.js';

export class GizmoRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly resizeHandler: () => void;

  constructor(private readonly container: HTMLElement, private readonly primitive: GizmoPrimitive) {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire 2D context for gizmo renderer.');
    }
    this.context = ctx;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.container.appendChild(this.canvas);
    this.resize();
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  render(camera: CameraState): void {
    this.resize();
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.primitive.show) {
      return;
    }
    for (const handle of this.primitive.handles) {
      if (!handle.visible) {
        continue;
      }
      ctx.save();
      ctx.strokeStyle = handle.active ? '#ffffff' : handle.color;
      ctx.lineWidth = handle.active ? 3 : 2;
      ctx.globalAlpha = handle.highlighted ? 1 : 0.8;
      switch (handle.type) {
        case 'axis':
          this.drawAxis(camera, handle);
          break;
        case 'plane':
          this.drawPlane(camera, handle);
          break;
        case 'ring':
          this.drawRing(camera, handle);
          break;
        case 'center':
          this.drawCenter(camera, handle);
          break;
      }
      ctx.restore();
    }
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    if (this.canvas.width !== rect.width || this.canvas.height !== rect.height) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.canvas.remove();
  }

  private drawAxis(camera: CameraState, handle: HandleGeometry): void {
    if (!handle.end) {
      return;
    }
    const start = projectToScreen(camera, handle.start);
    const end = projectToScreen(camera, handle.end);
    if (!start || !end) {
      return;
    }
    this.context.beginPath();
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(end.x, end.y);
    this.context.stroke();
  }

  private drawPlane(camera: CameraState, handle: HandleGeometry): void {
    const center = projectToScreen(camera, handle.start);
    if (!center) {
      return;
    }
    const radius = this.primitive.getScale() * 25;
    this.context.fillStyle = `${handle.color}55`;
    this.context.beginPath();
    this.context.rect(center.x - radius, center.y - radius, radius * 2, radius * 2);
    this.context.fill();
    this.context.strokeStyle = handle.color;
    this.context.strokeRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
  }

  private drawRing(camera: CameraState, handle: HandleGeometry): void {
    if (!handle.normal || !handle.radius) {
      return;
    }
    const center = projectToScreen(camera, handle.start);
    if (!center) {
      return;
    }
    const worldPoint = Vector3.add(handle.start, Vector3.multiplyByScalar(handle.normal, this.primitive.getScale() * handle.radius, new Vector3()), new Vector3());
    const edge = projectToScreen(camera, worldPoint);
    if (!edge) {
      return;
    }
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
    this.context.beginPath();
    this.context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.context.stroke();
  }

  private drawCenter(camera: CameraState, handle: HandleGeometry): void {
    const center = projectToScreen(camera, handle.start);
    if (!center) {
      return;
    }
    const radius = this.primitive.getScale() * 12;
    this.context.beginPath();
    this.context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.context.fillStyle = '#ffffff';
    this.context.globalAlpha = 0.85;
    this.context.fill();
  }
}
