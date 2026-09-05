import { describe, expect, it } from 'vitest';

describe('Wave 1: Cal.com Event Slug Coalescing Specs', () => {
  const cleanSlug = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  it('should coalesce whitespace and special symbols into standard URL slugs', () => {
    expect(cleanSlug('30 Min Quick Sync!')).toBe('30-min-quick-sync');
  });

  it('should remove leading and trailing dashes from booking slugs', () => {
    expect(cleanSlug('---team-standup---')).toBe('team-standup');
  });

  it('should correctly handle multi-hyphen runs', () => {
    expect(cleanSlug('executive---board--briefing')).toBe('executive-board-briefing');
  });
});
