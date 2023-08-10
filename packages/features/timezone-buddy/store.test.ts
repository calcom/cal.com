import { createTimezoneBuddyStore } from './store';
import { describe,it,expect } from 'vitest';

describe('createTimezoneBuddyStore', () => {
  it('should create a store with the correct initial state', () => {
    const initProps = {
      offsetTimezone: 'America/New_York',
      uniquedTimezones: ['America/New_York', 'Europe/London'],
    };
    const store = createTimezoneBuddyStore(initProps);

    expect(store.getState().offsetTimezone).toEqual(initProps.offsetTimezone);
    expect(store.getState().uniquedTimezones).toEqual(initProps.uniquedTimezones);
    expect(store.getState().timezones.size).toEqual(initProps.uniquedTimezones.length); // +1 for the offset timezone
    // We can't test INTL here because it's not available in node
  });
});
