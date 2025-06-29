import { expect, test } from 'vitest';
import { createEvent } from 'ics';

test('ics patch adds SCHEDULE-AGENT=CLIENT to ORGANIZER and ATTENDEE and removes METHOD', () => {
  const event = {
    uid: '1234',
    start: [2023, 1, 1, 10, 0],
    startInputType: 'local',
    duration: { minutes: 60 },
    title: 'Test Event',
    description: 'Desc',
    location: 'Loc',
    organizer: { name: 'Alice', email: 'alice@example.com' },
    attendees: [{ name: 'Bob', email: 'bob@example.com', partstat: 'NEEDS-ACTION' }],
    method: 'REQUEST',
  };
  const { error, value } = createEvent(event as any);
  expect(error).toBeUndefined();
  const iCal = value as string;
  // Ensure original iCal contains METHOD, ORGANIZER, ATTENDEE
  expect(iCal).toMatch(/METHOD:REQUEST/);
  expect(iCal).toMatch(/^ORGANIZER:/m);
  expect(iCal).toMatch(/^ATTENDEE:/m);
  // Apply patch logic
  const patched = iCal
    .replace(/^ORGANIZER(;[^:]*)?:/gm, 'ORGANIZER;SCHEDULE-AGENT=CLIENT$1:')
    .replace(/^ATTENDEE(;[^:]*)?:/gm, 'ATTENDEE;SCHEDULE-AGENT=CLIENT$1:')
    .replace(/METHOD:[^\r\n]+\r?\n/g, '');
  // METHOD line removed
  expect(patched).not.toMatch(/METHOD:/);
  // schedule-agent injected
  expect(patched).toMatch(/^ORGANIZER;SCHEDULE-AGENT=CLIENT:/m);
  expect(patched).toMatch(/^ATTENDEE;SCHEDULE-AGENT=CLIENT:/m);
});