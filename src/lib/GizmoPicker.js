import { HandleType } from './constants.js';

function intersectSphere(ray, sphere) {
  const { center, radius } = sphere;
  const L = center.clone().subtract(ray.origin);
  const tca = L.dot(ray.direction);
  if (tca < 0) return null;
  const d2 = L.lengthSq() - tca * tca;
  const radius2 = radius * radius;
  if (d2 > radius2) return null;
  const thc = Math.sqrt(radius2 - d2);
  const t0 = tca - thc;
  const t1 = tca + thc;
  const distance = t0 >= 0 ? t0 : t1;
  if (distance < 0) return null;
  return distance;
}

export class GizmoPicker {
  constructor(gizmoPrimitive) {
    this.gizmoPrimitive = gizmoPrimitive;
  }

  pick(ray) {
    const handles = this.gizmoPrimitive.getHandles();
    let closest = null;
    handles.forEach((handle) => {
      if (!handle.visible) return;
      const distance = intersectSphere(ray, handle.boundingSphere);
      if (distance == null) return;
      if (!closest || distance < closest.distance || (distance === closest.distance && handle.priority > closest.priority)) {
        closest = {
          id: handle.id,
          mode: handle.mode,
          axis: handle.axis,
          type: handle.type,
          priority: handle.priority,
          distance
        };
      }
    });
    return closest;
  }
}
