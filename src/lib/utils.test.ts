import { describe, expect, it, vi } from 'vitest';
import { buildCsv, cn, formatDate, formatMoney, downloadCsv } from './utils';

describe('cn', () => {
  it('merges tailwind classes with later overrides winning', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('formatDate', () => {
  it('formats ISO dates', () => {
    expect(formatDate('2026-03-15')).toBe('15 Mar 2026');
  });
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('formatMoney', () => {
  it('formats USD', () => {
    expect(formatMoney(1250.5)).toBe('$1,250.50');
  });
  it('returns em dash for null', () => {
    expect(formatMoney(null)).toBe('—');
  });
});

describe('buildCsv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(buildCsv([{ name: 'a,"b"', qty: 2 }])).toBe('name,qty\n"a,""b""",2');
  });
  it('renders null/undefined as empty cells', () => {
    expect(buildCsv([{ a: null, b: undefined, c: 1 }])).toBe('a,b,c\n,,1');
  });
  it('returns empty string for no rows', () => {
    expect(buildCsv([])).toBe('');
  });
});

describe('downloadCsv', () => {
  it('does nothing for empty rows', () => {
    const spy = vi.spyOn(document, 'createElement');
    downloadCsv('t.csv', []);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
