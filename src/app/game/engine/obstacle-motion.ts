import { ObstacleKind } from '../types';

export interface ObstacleMotion {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  anchorX: number;
  anchorY: number;
}

/**
 * Single source of truth for obstacle hitboxes and visuals so collision and
 * rendering can never drift apart.
 */
export function obstacleMotion(
  kind: ObstacleKind,
  x: number,
  y: number,
  size: number,
  speed: number,
  phase: number,
  time: number,
): ObstacleMotion {
  const wave = Math.sin(time * speed + phase);

  switch (kind) {
    case 'hammer': {
      const headX = x + wave * size * 0.95;
      const headY = y + Math.abs(wave) * 14;
      return {
        x: headX,
        y: headY,
        w: size * 0.62,
        h: size * 0.5,
        angle: wave * 0.28,
        anchorX: x,
        anchorY: y - size * 1.05,
      };
    }
    case 'saw': {
      const sawX = x + Math.sin(time * speed * 1.35 + phase) * size * 0.9;
      return {
        x: sawX,
        y,
        w: size * 0.6,
        h: size * 0.6,
        angle: time * 6 * (speed > 1.15 ? 1 : -1),
        anchorX: sawX,
        anchorY: y,
      };
    }
    case 'slider':
    case 'barrier': {
      const slideX = x + wave * size * 0.95;
      return {
        x: slideX,
        y,
        w: size * 0.5,
        h: size * 0.34,
        angle: 0,
        anchorX: slideX,
        anchorY: y,
      };
    }
    case 'spikes': {
      return {
        x,
        y,
        w: size,
        h: 62,
        angle: 0,
        anchorX: x,
        anchorY: y,
      };
    }
    case 'gap': {
      return {
        x,
        y,
        w: size * 1.15,
        h: 110,
        angle: 0,
        anchorX: x,
        anchorY: y,
      };
    }
    case 'ball': {
      const waveX = x + Math.sin(time * speed * 0.9 + phase) * size * 0.85;
      return {
        x: waveX,
        y,
        w: size * 0.72,
        h: size * 0.72,
        angle: time * 5 * (speed > 1.1 ? 1 : -1),
        anchorX: waveX,
        anchorY: y,
      };
    }
    case 'crusher': {
      const press = Math.abs(Math.sin(time * speed * 0.9 + phase));
      return {
        x,
        y: y - press * size * 0.7,
        w: size * 0.92,
        h: size * 0.52,
        angle: 0,
        anchorX: x,
        anchorY: y - size * 1.5,
      };
    }
    case 'number': {
      return {
        x,
        y,
        w: size,
        h: 112,
        angle: 0,
        anchorX: x,
        anchorY: y,
      };
    }
  }
}
