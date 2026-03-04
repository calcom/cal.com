import { filterSlotsByBusyTimes } from './guestAvailability';
import type { TimeSlot, BusyTime } from '../types';

describe('filterSlotsByBusyTimes', () => {
  it('removes slots overlapping busy times', () => {
    const slots: TimeSlot[] = [
      { start: new Date('2023-01-01T10:00:00Z'), end: new Date('2023-01-01T10:30:00Z') },
      { start: new Date('2023-01-01T11:00:00Z'), end: new Date('2023-01-01T11:30:00Z') },
    ];
    const busy: BusyTime[] = [
      { start: new Date('2023-01-01T10:15:00Z'), end: new Date('2023-01-01T10:45:00Z') },
    ];
    const result = filterSlotsByBusyTimes(slots, busy);
    expect(result).toEqual([
      { start: new Date('2023-01-01T11:00:00Z'), end: new Date('2023-01-01T11:30:00Z') },
    ]);
  });
});