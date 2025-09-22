import { Vector3 } from './math/Vector3.js';

const WGS84_A = 6378137.0;
const WGS84_E2 = 6.69437999014e-3;

export interface Geodetic {
  latitude: number;
  longitude: number;
  height: number;
}

export function cartesianToGeodetic(position: Vector3): Geodetic {
  const x = position.x;
  const y = position.y;
  const z = position.z;

  const longitude = Math.atan2(y, x);
  const p = Math.sqrt(x * x + y * y);
  const theta = Math.atan2(z * WGS84_A, p * WGS84_A * (1 - WGS84_E2));
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  const latitude = Math.atan2(
    z + WGS84_E2 * (1 - WGS84_E2) * WGS84_A * sinTheta * sinTheta * sinTheta,
    p - WGS84_E2 * WGS84_A * cosTheta * cosTheta * cosTheta
  );

  const sinLat = Math.sin(latitude);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const height = p / Math.cos(latitude) - N;

  return { latitude, longitude, height };
}

export function eastNorthUp(position: Vector3): { east: Vector3; north: Vector3; up: Vector3 } {
  const { latitude, longitude } = cartesianToGeodetic(position);
  const cosLat = Math.cos(latitude);
  const sinLat = Math.sin(latitude);
  const cosLon = Math.cos(longitude);
  const sinLon = Math.sin(longitude);

  const east = new Vector3(-sinLon, cosLon, 0);
  const north = new Vector3(-sinLat * cosLon, -sinLat * sinLon, cosLat);
  const up = new Vector3(cosLat * cosLon, cosLat * sinLon, sinLat);

  return {
    east: east.normalize(),
    north: north.normalize(),
    up: up.normalize()
  };
}
