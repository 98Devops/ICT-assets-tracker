import { describe, expect, it } from 'vitest';
import { straightLine } from './depreciation';

const asOf = new Date('2026-07-07');

describe('straightLine depreciation', () => {
  it('depreciates mid-life assets', () => {
    // $800 over 4 years, bought 2 years ago → ~$400 book value
    const r = straightLine(800, '2024-07-07', 4, asOf)!;
    expect(r.annual).toBe(200);
    expect(r.accumulated).toBeGreaterThan(395);
    expect(r.accumulated).toBeLessThan(405);
    expect(r.bookValue).toBeCloseTo(800 - r.accumulated, 2);
    expect(r.fullyDepreciated).toBe(false);
  });

  it('floors fully depreciated assets at zero', () => {
    const r = straightLine(500, '2018-01-01', 4, asOf)!;
    expect(r.bookValue).toBe(0);
    expect(r.accumulated).toBe(500);
    expect(r.fullyDepreciated).toBe(true);
  });

  it('handles brand-new assets', () => {
    const r = straightLine(1000, '2026-07-07', 5, asOf)!;
    expect(r.accumulated).toBe(0);
    expect(r.bookValue).toBe(1000);
  });

  it('returns null without cost or date', () => {
    expect(straightLine(null, '2024-01-01', 4, asOf)).toBeNull();
    expect(straightLine(100, null, 4, asOf)).toBeNull();
    expect(straightLine(100, 'not-a-date', 4, asOf)).toBeNull();
  });

  it('future purchase dates do not produce negative depreciation', () => {
    const r = straightLine(100, '2027-01-01', 4, asOf)!;
    expect(r.accumulated).toBe(0);
    expect(r.bookValue).toBe(100);
  });
});
