const DEG2RAD = Math.PI / 180;

const DEFAULT_CONFIG = {
  translate: {
    step: 0,
    microStep: 0,
    macroMultiplier: 10,
  },
  rotate: {
    step: 5 * DEG2RAD,
    microStep: 1 * DEG2RAD,
    macroMultiplier: 6,
  },
  scale: {
    step: 0,
    microStep: 0,
    macroMultiplier: 10,
  },
};

export class Snapper {
  constructor(config = {}) {
    this.config = mergeConfig(DEFAULT_CONFIG, config);
  }

  setConfig(config) {
    this.config = mergeConfig(DEFAULT_CONFIG, config);
  }

  applyTranslation(value, modifiers = {}) {
    return snapValue(value, this.config.translate, modifiers);
  }

  applyRotation(value, modifiers = {}) {
    return snapValue(value, this.config.rotate, modifiers);
  }

  applyScale(value, modifiers = {}) {
    return snapValue(value, this.config.scale, modifiers);
  }
}

function mergeConfig(base, override) {
  const result = { ...base };
  for (const key of Object.keys(base)) {
    result[key] = { ...base[key], ...(override[key] || {}) };
  }
  return result;
}

function snapValue(value, config, modifiers) {
  const { step, microStep, macroMultiplier } = config;
  let targetStep = step;
  if (modifiers && modifiers.shiftKey && microStep > 0) {
    targetStep = microStep;
  }
  if (modifiers && modifiers.ctrlKey && targetStep > 0) {
    targetStep = targetStep / (macroMultiplier || 1);
  }
  if (!targetStep || targetStep <= 0) {
    return value;
  }
  const snapped = Math.round(value / targetStep) * targetStep;
  return snapped;
}

export function parseInputValue(text, unitHint = 'm') {
  if (!text) {
    return { value: 0, unit: unitHint };
  }
  const trimmed = String(text).trim();
  const match = trimmed.match(/([-+]?\d*\.?\d+)([a-z°%]*)/i);
  if (!match) {
    return { value: Number(trimmed) || 0, unit: unitHint };
  }
  const value = parseFloat(match[1]);
  const unit = match[2] || unitHint;
  let scaled = value;
  switch (unit) {
    case 'cm':
      scaled = value / 100;
      break;
    case 'mm':
      scaled = value / 1000;
      break;
    case 'km':
      scaled = value * 1000;
      break;
    case '°':
    case 'deg':
      scaled = value * DEG2RAD;
      break;
    case '%':
      scaled = value / 100;
      break;
    default:
      break;
  }
  return { value: scaled, unit };
}
