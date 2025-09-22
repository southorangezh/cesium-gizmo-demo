import { vec3, add, scale, normalize } from '../math/vec3.js';
import { decompose } from '../math/matrix4.js';

function ensureMatrix(target) {
  if (!target) {
    return null;
  }
  if (Array.isArray(target.matrix)) {
    return target.matrix;
  }
  if (typeof target.getMatrix === 'function') {
    return target.getMatrix();
  }
  if (Array.isArray(target)) {
    return target;
  }
  return target.matrix || null;
}

export class PivotResolver {
  constructor() {
    this.cursor = vec3(0, 0, 0);
  }

  setCursor(position) {
    if (position) {
      this.cursor = position;
    }
  }

  resolve(options) {
    const { targets = [], pivot = 'origin' } = options;
    const matrices = targets.map((t) => ensureMatrix(t)).filter(Boolean);
    const positions = matrices.map((m) => decompose(m).translation);

    if (pivot === 'cursor') {
      return { pivot: this.cursor, perTarget: positions };
    }

    if (pivot === 'median') {
      if (!positions.length) {
        return { pivot: vec3(0, 0, 0), perTarget: [] };
      }
      const sum = positions.reduce((acc, v) => add(acc, v), vec3(0, 0, 0));
      const pivotPoint = scale(sum, 1 / positions.length);
      return { pivot: pivotPoint, perTarget: positions };
    }

    if (pivot === 'individual') {
      return { pivot: null, perTarget: positions };
    }

    // origin fallback
    const pivotPoint = positions[0] || vec3(0, 0, 0);
    return { pivot: pivotPoint, perTarget: positions };
  }
}
