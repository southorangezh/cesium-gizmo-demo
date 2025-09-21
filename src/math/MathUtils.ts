export const EPSILON = 1e-10;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function approxEquals(a: number, b: number, epsilon = EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}
