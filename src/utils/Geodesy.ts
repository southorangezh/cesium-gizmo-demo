import { Matrix3 } from '../math/Matrix3.js';
import { Vector3 } from '../math/Vector3.js';

const WGS84_A = 6378137.0;
const WGS84_B = 6356752.3142451793;
const WGS84_E2 = 1 - (WGS84_B * WGS84_B) / (WGS84_A * WGS84_A);

export interface Cartographic {
  longitude: number;
  latitude: number;
  height: number;
}

export function ecefToCartographic(position: Vector3): Cartographic {
  const x = position.x;
  const y = position.y;
  const z = position.z;
  const longitude = Math.atan2(y, x);
  const p = Math.sqrt(x * x + y * y);
  const theta = Math.atan2(z * WGS84_A, p * WGS84_B);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const latitude = Math.atan2(z + (WGS84_E2 * WGS84_B) * sinTheta * sinTheta * sinTheta, p - (WGS84_E2 * WGS84_A) * cosTheta * cosTheta * cosTheta);
  const sinLat = Math.sin(latitude);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const height = p / Math.cos(latitude) - N;
  return { longitude, latitude, height };
}

export function eastNorthUpMatrix(origin: Vector3, result = new Matrix3()): Matrix3 {
  const cartographic = ecefToCartographic(origin);
  const lon = cartographic.longitude;
  const lat = cartographic.latitude;

  const cosLon = Math.cos(lon);
  const sinLon = Math.sin(lon);
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);

  const east = new Vector3(-sinLon, cosLon, 0);
  const north = new Vector3(-sinLat * cosLon, -sinLat * sinLon, cosLat);
  const up = new Vector3(cosLat * cosLon, cosLat * sinLon, sinLat);

  return result.setFromColumns(east, north, up);
}

export function enuAxes(origin: Vector3): { east: Vector3; north: Vector3; up: Vector3 } {
  const matrix = eastNorthUpMatrix(origin);
  const e = matrix.elements;
  return {
    east: new Vector3(e[0], e[1], e[2]),
    north: new Vector3(e[3], e[4], e[5]),
    up: new Vector3(e[6], e[7], e[8])
  };
}
