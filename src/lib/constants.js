export const Axis = Object.freeze({
  X: 'x',
  Y: 'y',
  Z: 'z'
});

export const Mode = Object.freeze({
  TRANSLATE: 'translate',
  ROTATE: 'rotate',
  SCALE: 'scale'
});

export const Orientation = Object.freeze({
  GLOBAL: 'global',
  LOCAL: 'local',
  VIEW: 'view',
  ENU: 'enu',
  NORMAL: 'normal',
  GIMBAL: 'gimbal'
});

export const Pivot = Object.freeze({
  ORIGIN: 'origin',
  MEDIAN: 'median',
  CURSOR: 'cursor',
  INDIVIDUAL: 'individual'
});

export const HandleType = Object.freeze({
  AXIS: 'axis',
  PLANE: 'plane',
  RING: 'ring',
  SCREEN: 'screen',
  CENTER: 'center'
});

export const DEFAULT_COLORS = {
  x: '#ff4d4d',
  y: '#3fe25b',
  z: '#4d9bff',
  highlight: '#ffffff',
  active: '#ffa500'
};

export const DEFAULT_OPTIONS = {
  mode: Mode.TRANSLATE,
  orientation: Orientation.GLOBAL,
  pivot: Pivot.ORIGIN,
  snap: {
    translate: 0,
    rotate: 0,
    scale: 0
  },
  enable: {
    translate: true,
    rotate: true,
    scale: true
  },
  size: {
    screenPixelRadius: 96,
    minScale: 0.7,
    maxScale: 2.5
  }
};
