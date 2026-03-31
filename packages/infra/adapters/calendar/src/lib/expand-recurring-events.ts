import ICAL from "ical.js";

import type { BusyTimeslot } from "../calendar-adapter-types";

const MAX_ITERATIONS = 365;

// Frequencies that would produce too many occurrences inside a typical
// date range and are not meaningful for busy-time expansion.
const EXCESSIVE_FREQUENCIES = ["HOURLY", "SECONDLY", "MINUTELY"];

/**
 * Expand recurring VEVENT components into individual BusyTimeslot occurrences
 * within the given date range.
 *
 * Uses ical.js iterator — same logic as the existing CalDAV and ICS Feed
 * implementations in packages/lib/CalendarService.ts.
 *
 * ical.js natively handles RRULE modifiers (BYDAY, BYMONTHDAY, BYSETPOS)
 * and EXDATE properties through its RecurExpansion engine, so no additional
 * processing is needed for those.
 *
 * Non-recurring events are returned as-is (single slot).
 * Recurring events with HOURLY/SECONDLY/MINUTELY frequencies are skipped
 * to avoid excessive iterations.
 */
export function expandVEventsFromICal(
  icsData: string,
  dateFrom: Date,
  dateTo: Date
): BusyTimeslot[] {
  const slots: BusyTimeslot[] = [];

  let parsed: unknown[];
  try {
    parsed = ICAL.parse(icsData);
  } catch {
    return slots;
  }

  const component = new ICAL.Component(parsed);

  // Extract VTIMEZONE for timezone-aware recurrence expansion
  const vtimezoneComp = component.getFirstSubcomponent("vtimezone");

  const vevents = component.getAllSubcomponents("vevent");

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);

    if (!event.startDate || !event.endDate) continue;

    if (event.isRecurring()) {
      expandRecurring(event, vtimezoneComp, dateFrom, dateTo, slots);
    } else {
      expandSingle(event, dateFrom, dateTo, slots);
    }
  }

  return slots;
}

function expandRecurring(
  event: ICAL.Event,
  vtimezoneComp: ICAL.Component | null,
  dateFrom: Date,
  dateTo: Date,
  slots: BusyTimeslot[]
): void {
  const recurrenceTypes = event.getRecurrenceTypes() as unknown as Record<string, boolean>;
  const hasExcessive = EXCESSIVE_FREQUENCIES.some((freq) => recurrenceTypes[freq]);
  if (hasExcessive) {
    return;
  }

  // Use the event's own start date so ical.js correctly applies EXDATE,
  // BYDAY, and other modifiers that depend on the original recurrence anchor.
  const iterator = event.iterator(event.startDate);

  let remaining = MAX_ITERATIONS;
  let current: ICAL.Time;
  let currentStart: Date | null = null;

  while (
    remaining > 0 &&
    (currentStart === null || currentStart <= dateTo) &&
    (current = iterator.next())
  ) {
    remaining -= 1;

    let occurrence: ReturnType<typeof event.getOccurrenceDetails>;
    try {
      // @see https://github.com/mozilla-comm/ical.js/issues/514
      occurrence = event.getOccurrenceDetails(current);
    } catch {
      continue;
    }

    if (!occurrence) continue;

    // Apply VTIMEZONE if present — CalDAV returns timezone-aware recurrences
    // but the raw ICAL.Time may be in UTC without conversion
    if (vtimezoneComp) {
      const zone = new ICAL.Timezone(vtimezoneComp);
      occurrence.startDate = occurrence.startDate.convertToZone(zone);
      occurrence.endDate = occurrence.endDate.convertToZone(zone);
    }

    const occStart = occurrence.startDate.toJSDate();
    const occEnd = occurrence.endDate.toJSDate();
    currentStart = occStart;

    if (occStart >= dateFrom && occStart <= dateTo) {
      slots.push({ start: occStart, end: occEnd });
    }
  }
}

function expandSingle(
  event: ICAL.Event,
  dateFrom: Date,
  dateTo: Date,
  slots: BusyTimeslot[]
): void {
  const start = event.startDate.toJSDate();
  const end = event.endDate.toJSDate();

  if (start < dateTo && end > dateFrom) {
    slots.push({ start, end });
  }
}
