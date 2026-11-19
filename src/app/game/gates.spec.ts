import { GateOp } from './types';
import { MAX_CROWD, applyGateOp, gateVisual } from './gates';

describe('gate math', () => {
  const apply = (count: number, op: GateOp) => applyGateOp(count, op);

  it('adds crowd', () => {
    expect(apply(10, { kind: 'add', value: 25 })).toBe(35);
  });

  it('multiplies crowd', () => {
    expect(apply(13, { kind: 'mul', value: 2 })).toBe(26);
    expect(apply(13, { kind: 'mul', value: 3 })).toBe(39);
  });

  it('subtracts without going negative', () => {
    expect(apply(8, { kind: 'sub', value: 10 })).toBe(0);
    expect(apply(0, { kind: 'sub', value: 10 })).toBe(0);
  });

  it('divides and floors', () => {
    expect(apply(17, { kind: 'div', value: 2 })).toBe(8);
    expect(apply(3, { kind: 'div', value: 3 })).toBe(1);
  });

  it('applies percentage bonuses', () => {
    expect(apply(40, { kind: 'percent', value: 50 })).toBe(60);
    expect(apply(1, { kind: 'percent', value: 25 })).toBe(1);
  });

  it('treats special gates as crowd-neutral', () => {
    expect(apply(14, { kind: 'shield', value: 1 })).toBe(14);
    expect(apply(14, { kind: 'magnet', value: 1 })).toBe(14);
    expect(apply(14, { kind: 'turbo', value: 1 })).toBe(14);
    expect(apply(14, { kind: 'coins', value: 20 })).toBe(14);
  });

  it('clamps to the maximum crowd size', () => {
    expect(apply(MAX_CROWD, { kind: 'mul', value: 3 })).toBe(MAX_CROWD);
  });

  it('floors fractional percentage results', () => {
    expect(apply(3, { kind: 'percent', value: 33 })).toBe(3);
    expect(apply(10, { kind: 'percent', value: 33 })).toBe(13);
  });

  it('labels every gate type', () => {
    expect(gateVisual({ kind: 'add', value: 10 }).label).toBe('+10');
    expect(gateVisual({ kind: 'mul', value: 2 }).label).toBe('x2');
    expect(gateVisual({ kind: 'div', value: 2 }).label).toBe('/2');
    expect(gateVisual({ kind: 'shield', value: 1 }).label).toBe('SHIELD');
    expect(gateVisual({ kind: 'coins', value: 25 }).tone).toBe('coin');
  });
});
