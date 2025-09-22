export class HudOverlay {
  constructor(container) {
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'manipulator-hud';
    this.root.innerHTML = `
      <div class="hud-content">
        <div class="hud-row">
          <span class="hud-label">ΔX</span><span class="hud-value" data-axis="x">0</span>
          <span class="hud-label">ΔY</span><span class="hud-value" data-axis="y">0</span>
          <span class="hud-label">ΔZ</span><span class="hud-value" data-axis="z">0</span>
          <span class="hud-label">Δθ</span><span class="hud-value" data-axis="angle">0°</span>
          <span class="hud-label">ΔS</span><span class="hud-value" data-axis="scale">1</span>
        </div>
        <div class="hud-row">
          <label>Input:</label>
          <input type="text" class="hud-input" placeholder="Type value e.g. 10cm or 15°" />
          <button class="hud-apply">Apply</button>
          <button class="hud-cancel">Cancel</button>
        </div>
      </div>
    `;
    container.appendChild(this.root);
    this.values = {
      x: this.root.querySelector('[data-axis="x"]'),
      y: this.root.querySelector('[data-axis="y"]'),
      z: this.root.querySelector('[data-axis="z"]'),
      angle: this.root.querySelector('[data-axis="angle"]'),
      scale: this.root.querySelector('[data-axis="scale"]'),
    };
    this.input = this.root.querySelector('.hud-input');
    this.applyButton = this.root.querySelector('.hud-apply');
    this.cancelButton = this.root.querySelector('.hud-cancel');
    this.onSubmit = () => {};
    this.onCancel = () => {};
    this.applyButton.addEventListener('click', () => this._submit());
    this.cancelButton.addEventListener('click', () => this._cancel());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this._submit();
      } else if (event.key === 'Escape') {
        this._cancel();
      }
    });
  }

  setHandlers({ onSubmit, onCancel }) {
    this.onSubmit = onSubmit || this.onSubmit;
    this.onCancel = onCancel || this.onCancel;
  }

  showDelta({ translation, rotation, scale }) {
    if (translation) {
      this.values.x.textContent = translation.x.toFixed(3);
      this.values.y.textContent = translation.y.toFixed(3);
      this.values.z.textContent = translation.z.toFixed(3);
    }
    if (rotation) {
      const angle = 2 * Math.acos(Math.min(1, Math.max(-1, rotation.w)));
      this.values.angle.textContent = (angle * 180 / Math.PI).toFixed(2) + '°';
    }
    if (scale) {
      this.values.scale.textContent = `${scale.x.toFixed(3)}/${scale.y.toFixed(3)}/${scale.z.toFixed(3)}`;
    }
  }

  clearDelta() {
    this.values.x.textContent = '0';
    this.values.y.textContent = '0';
    this.values.z.textContent = '0';
    this.values.angle.textContent = '0°';
    this.values.scale.textContent = '1';
    this.input.value = '';
  }

  _submit() {
    const value = this.input.value;
    if (!value) {
      return;
    }
    this.onSubmit(value);
  }

  _cancel() {
    this.input.value = '';
    this.onCancel();
  }

  destroy() {
    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }
}
