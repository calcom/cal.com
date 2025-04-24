import type { CalendarEvent } from "@calcom/types/Calendar";

export function getReplyToHeader(calEvent: CalendarEvent, replyTo: string | string[]) {
  if (calEvent.hideOrganizerEmail) return {};
  return { replyTo };
}
