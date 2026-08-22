
import { describe, it, expect } from 'vitest';
import { parseFractionalTimezoneOffset } from './fractionalTimezones';

describe('Cal.com Fractional Timezone Calculator', () => {
  it('correctly calculates negative fractional timezones (Newfoundland GMT-3:30)', () => {
    expect(parseFractionalTimezoneOffset('GMT-03:30')).toBe(-210);
    expect(parseFractionalTimezoneOffset('GMT-3:30')).toBe(-210);
  });

  it('correctly calculates negative fractional timezones (Marquesas GMT-9:30)', () => {
    expect(parseFractionalTimezoneOffset('GMT-09:30')).toBe(-570);
  });

  it('correctly calculates positive fractional timezones (India GMT+5:30, Nepal GMT+5:45)', () => {
    expect(parseFractionalTimezoneOffset('GMT+05:30')).toBe(330);
    expect(parseFractionalTimezoneOffset('GMT+05:45')).toBe(345);
  });
});
