import { describe, expect, it } from 'vitest';
import { autoMapHeader, normalizeDate, validateRows } from './importer';

describe('autoMapHeader', () => {
  it('maps exact and synonym headers', () => {
    expect(autoMapHeader('Serial No')).toBe('serial_number');
    expect(autoMapHeader('Asset Tag')).toBe('asset_tag');
    expect(autoMapHeader('PRICE')).toBe('cost');
    expect(autoMapHeader('Room')).toBe('location');
    expect(autoMapHeader('random column')).toBeNull();
  });
});

describe('normalizeDate', () => {
  it('passes ISO through', () => {
    expect(normalizeDate('2024-05-01')).toBe('2024-05-01');
  });
  it('converts dd/mm/yyyy', () => {
    expect(normalizeDate('3/5/2024')).toBe('2024-05-03');
    expect(normalizeDate('15-11-2023')).toBe('2023-11-15');
  });
  it('returns empty for junk', () => {
    expect(normalizeDate('May last year')).toBe('');
    expect(normalizeDate('')).toBe('');
  });
});

describe('validateRows', () => {
  const mapping = { Name: 'name', Type: 'category', 'Serial No': 'serial_number', Cost: 'cost' } as const;

  it('validates good rows and normalizes categories', () => {
    const { results, validCount } = validateRows(
      [
        { Name: 'HP Laptop', Type: 'Notebook', 'Serial No': 'ABC123', Cost: '$450.00' },
        { Name: 'Epson Projector', Type: 'projector', 'Serial No': '', Cost: '' },
      ],
      { ...mapping },
      100,
    );
    expect(validCount).toBe(2);
    expect(results[0].values?.category).toBe('laptop');
    expect(results[0].values?.cost).toBe(450);
    expect(results[0].values?.asset_tag).toBe('ICT-0100'); // auto-generated
    expect(results[1].values?.asset_tag).toBe('ICT-0101');
  });

  it('rejects rows without a name and flags duplicate tags', () => {
    const { results, validCount } = validateRows(
      [
        { Name: '', Type: 'laptop', 'Serial No': 'X', Cost: '10' },
        { Name: 'Acer Monitor', Type: 'laptop', 'Serial No': 'Y', Cost: '10' },
      ],
      { ...mapping, Tag: 'asset_tag' },
      1,
    );
    expect(validCount).toBe(1);
    expect(results[0].errors.join(' ')).toMatch(/name/i);
  });

  it('maps unknown category to other and unknown status handled by default', () => {
    const { results } = validateRows(
      [{ Name: 'Mystery Box', Type: 'gadget', 'Serial No': '', Cost: '' }],
      { ...mapping },
      1,
    );
    expect(results[0].values?.category).toBe('other');
    expect(results[0].values?.status).toBe('active');
  });
});
