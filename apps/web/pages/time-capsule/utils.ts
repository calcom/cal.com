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
  eventTypesLengthRecord: Record<string, number> | null
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
        console.log("event", event);
        if (typeof event.length === "number") {
          resultRecord[String(event.id)] = event.length;
        }
      }
    });
  }
  return resultRecord;
}
