export class Snapper {
  constructor(stepConfig = {}) {
    this.translateStep = stepConfig.translate || 0;
    this.rotateStep = stepConfig.rotate || 0;
    this.scaleStep = stepConfig.scale || 0;
    this.modifierConfig = stepConfig.modifiers || {
      coarse: { key: 'ShiftLeft', multiplier: 0.1 },
      fine: { key: 'ControlLeft', multiplier: 10 }
    };
  }

  update(stepConfig = {}) {
    if (typeof stepConfig.translate === 'number') this.translateStep = stepConfig.translate;
    if (typeof stepConfig.rotate === 'number') this.rotateStep = stepConfig.rotate;
    if (typeof stepConfig.scale === 'number') this.scaleStep = stepConfig.scale;
    if (stepConfig.modifiers) this.modifierConfig = { ...this.modifierConfig, ...stepConfig.modifiers };
  }

  snapTranslate(value, modifiers = new Set()) {
    return this._snapValue(value, this.translateStep, modifiers);
  }

  snapRotate(value, modifiers = new Set()) {
    return this._snapValue(value, this.rotateStep, modifiers);
  }

  snapScale(value, modifiers = new Set()) {
    return this._snapValue(value, this.scaleStep, modifiers);
  }

  _snapValue(value, step, modifiers) {
    if (!step || step <= 0) return value;
    let workingStep = step;
    modifiers.forEach((code) => {
      const modifier = Object.values(this.modifierConfig).find((m) => m.key === code);
      if (modifier) {
        workingStep *= modifier.multiplier;
      }
    });
    if (workingStep === 0) return value;
    return Math.round(value / workingStep) * workingStep;
  }
}
