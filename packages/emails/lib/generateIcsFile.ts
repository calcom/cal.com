import type { TFunction } from "next-i18next";

import type { CalendarEvent } from "@calcom/types/Calendar";

import generateIcsString from "./generateIcsString";

export default function generateIcsFile({
  calEvent,
  title,
  subtitle,
  role,
  t,
  isRequestReschedule,
}: {
  calEvent: CalendarEvent;
  title: string;
  subtitle: string;
  role: "attendee" | "organizer";
  t?: TFunction;
  isRequestReschedule?: boolean;
}) {
  // O365 deletes emails if the calendar event is selected. Currently no option to disable this on the web
  if (calEvent.destinationCalendar && calEvent.destinationCalendar[0].integration === "office365_calendar")
    return null;

  return {
    filename: "event.ics",
    content: generateIcsString({
      event: calEvent,
      title,
      subtitle,
      role,
      status: "CONFIRMED",
      t,
      isRequestReschedule,
    }),
    method: "REQUEST",
  };
}
