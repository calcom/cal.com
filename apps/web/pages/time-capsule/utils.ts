import type { Prisma } from "@calcom/prisma/client";

type EventType = {
  id: number;
  length: number | undefined;
  locations: Prisma.JsonValue;
  logo: string | undefined;
  title: string;
};

export function calculateTotalMeetingTime(
  bookingEventIds: number[] | undefined,
  eventTypesLengthRecord: Record<string, number | undefined> | null
) {
  if (bookingEventIds === undefined || !eventTypesLengthRecord) {
    return 0;
  }
  let total = 0;
  bookingEventIds.forEach((bookingEventId) => {
    total += eventTypesLengthRecord[String(bookingEventId)];
  });
  return total;
}
export function createEventsLengthRecord(events: EventType[] | undefined) {
  const resultRecord: Record<string, number | undefined> = {};
  if (!events) {
    return null;
  } else {
    events.forEach((event) => {
      if (event.id) {
        if (typeof event.length === "number") {
          resultRecord[String(event.id)] = event.length;
        }
      }
    });
  }
  return resultRecord;
}

export function eventNamesById(events: EventType[] | undefined) {
  const eventObj: Record<string, string> = {};
  if (events === undefined) {
    return null;
  }
  events.forEach((event) => {
    eventObj[String(event.id)] = event.title;
  });
  return eventObj;
}

export function eventFrequencyObj(events: number[] | undefined) {
  const eventFrequencies: Record<string, number> = {};
  if (events === undefined) {
    return null;
  }
  events.forEach((event) => {
    eventFrequencies[event] = typeof eventFrequencies[event] === "number" ? eventFrequencies[event] + 1 : 1;
  });
  return eventFrequencies;
}
export function makeEventNameArr(freq: Record<string, number> | null, names: Record<string, string> | null) {
  if (!freq || !names) {
    return null;
  }
  const eventNamesAndFrequencies: [string, number][] = [];
  for (const id in freq) {
    const frequencyOfEvent = freq[id];
    eventNamesAndFrequencies.push([names[id], frequencyOfEvent]);
  }
  return eventNamesAndFrequencies;
}
