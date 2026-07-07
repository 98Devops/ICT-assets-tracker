import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { validateAttachment } from './api';

const fakeFile = (size: number, type: string) =>
  ({ size, type, name: 'f' }) as unknown as File;

describe('validateAttachment', () => {
  it('accepts a normal PDF', () => {
    expect(validateAttachment(fakeFile(2_000_000, 'application/pdf'))).toBeNull();
  });
  it('accepts images', () => {
    expect(validateAttachment(fakeFile(500_000, 'image/jpeg'))).toBeNull();
    expect(validateAttachment(fakeFile(500_000, 'image/png'))).toBeNull();
  });
  it('rejects oversize files with the size in the message', () => {
    const msg = validateAttachment(fakeFile(15 * 1024 * 1024, 'application/pdf'));
    expect(msg).toMatch(/too large/i);
    expect(msg).toMatch(/15\.0 MB/);
  });
  it('rejects empty files', () => {
    expect(validateAttachment(fakeFile(0, 'application/pdf'))).toMatch(/empty/i);
  });
  it('rejects executables', () => {
    expect(validateAttachment(fakeFile(1000, 'application/x-msdownload'))).toMatch(/unsupported/i);
  });
  it('allows unknown/absent mime type (some cameras omit it)', () => {
    expect(validateAttachment(fakeFile(1000, ''))).toBeNull();
  });
});
