import { GateOp } from './types';

export const MAX_CROWD = 99_999;

export type GateTone = 'good' | 'bad' | 'power' | 'coin';

export interface GateVisual {
  label: string;
  tone: GateTone;
}

export function gateVisual(op: GateOp): GateVisual {
  switch (op.kind) {
    case 'add':
      return { label: `+${op.value}`, tone: 'good' };
    case 'sub':
      return { label: `-${op.value}`, tone: 'bad' };
    case 'mul':
      return { label: `x${op.value}`, tone: 'power' };
    case 'div':
      return { label: `/${op.value}`, tone: 'bad' };
    case 'percent':
      return { label: `+${op.value}%`, tone: 'good' };
    case 'shield':
      return { label: 'SHIELD', tone: 'power' };
    case 'magnet':
      return { label: 'MAGNET', tone: 'power' };
    case 'turbo':
      return { label: 'TURBO', tone: 'power' };
    case 'coins':
      return { label: `+${op.value}`, tone: 'coin' };
  }
}

export function gateColor(tone: GateTone): { fill: string; deep: string; glow: string } {
  switch (tone) {
    case 'good':
      return { fill: '#4ee08a', deep: '#11874c', glow: '#c6ffdd' };
    case 'bad':
      return { fill: '#ff6b6b', deep: '#a01f2c', glow: '#ffd0d0' };
    case 'power':
      return { fill: '#b07bff', deep: '#5a2ea8', glow: '#e9dbff' };
    case 'coin':
      return { fill: '#ffcf4d', deep: '#a87400', glow: '#fff0b8' };
  }
}

/** Pure gate math. Crowd is always clamped to [0, MAX_CROWD]. */
export function applyGateOp(count: number, op: GateOp): number {
  const safe = Math.max(0, count);
  let next = safe;
  switch (op.kind) {
    case 'add':
      next = safe + op.value;
      break;
    case 'sub':
      next = safe - op.value;
      break;
    case 'mul':
      next = safe * op.value;
      break;
    case 'div':
      next = Math.floor(safe / Math.max(2, op.value));
      break;
    case 'percent':
      next = Math.floor(safe * (1 + op.value / 100));
      break;
    case 'shield':
    case 'magnet':
    case 'turbo':
    case 'coins':
      next = safe;
      break;
  }
  return Math.min(MAX_CROWD, Math.max(0, Math.round(next)));
}

export function isSpecialGate(op: GateOp): boolean {
  return op.kind === 'shield' || op.kind === 'magnet' || op.kind === 'turbo' || op.kind === 'coins';
}
