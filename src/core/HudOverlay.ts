import { HudDisplayValues } from '../types.js';
import { Vector3 } from '../math/Vector3.js';
import { toDegrees } from '../math/MathUtils.js';

export class HudOverlay {
  private readonly root: HTMLElement;
  private readonly header: HTMLElement;
  private readonly deltaList: HTMLElement;
  private visible = true;

  constructor(private readonly container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'gizmo-hud';
    this.root.style.position = 'absolute';
    this.root.style.top = '12px';
    this.root.style.right = '12px';
    this.root.style.padding = '8px 12px';
    this.root.style.background = 'rgba(0,0,0,0.6)';
    this.root.style.color = '#fff';
    this.root.style.fontFamily = 'monospace';
    this.root.style.fontSize = '12px';
    this.root.style.borderRadius = '4px';
    this.root.style.pointerEvents = 'none';

    this.header = document.createElement('div');
    this.deltaList = document.createElement('div');
    this.deltaList.style.marginTop = '4px';

    this.root.appendChild(this.header);
    this.root.appendChild(this.deltaList);
    this.container.appendChild(this.root);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.style.display = visible ? 'block' : 'none';
  }

  update(values: HudDisplayValues): void {
    if (!this.visible) {
      return;
    }
    this.header.textContent = `${values.mode.toUpperCase()} :: ${values.axisLabel}${values.snapped ? ' (SNAP)' : ''}`;
    const items: string[] = [];
    if (values.deltaTranslation) {
      items.push(`ΔT ${formatVector(values.deltaTranslation)}`);
    }
    if (values.deltaRotation) {
      items.push(`ΔR ${formatAngles(values.deltaRotation)}`);
    }
    if (values.deltaScale) {
      items.push(`ΔS ${formatScale(values.deltaScale)}`);
    }
    this.deltaList.innerHTML = items.map((item) => `<div>${item}</div>`).join('');
  }

  destroy(): void {
    this.root.remove();
  }
}

function formatVector(vector: Vector3): string {
  return `${formatDistance(vector.x)}, ${formatDistance(vector.y)}, ${formatDistance(vector.z)}`;
}

function formatDistance(value: number): string {
  const absValue = Math.abs(value);
  let unit = 'm';
  let scaled = value;
  if (absValue < 0.01) {
    unit = 'mm';
    scaled = value * 1000;
  } else if (absValue < 1) {
    unit = 'cm';
    scaled = value * 100;
  } else if (absValue > 1000) {
    unit = 'km';
    scaled = value / 1000;
  }
  return `${scaled.toFixed(3)}${unit}`;
}

function formatAngles(vector: Vector3): string {
  return `${toDegrees(vector.x).toFixed(2)}°, ${toDegrees(vector.y).toFixed(2)}°, ${toDegrees(vector.z).toFixed(2)}°`;
}

function formatScale(vector: Vector3): string {
  return `${vector.x.toFixed(3)}, ${vector.y.toFixed(3)}, ${vector.z.toFixed(3)}`;
}
