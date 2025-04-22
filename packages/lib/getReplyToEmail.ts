import type { CalendarEvent } from "@calcom/types/Calendar";

/**
 * Returns the reply-to email address to use, with fallback to organizer's email
 */
export const getReplyToEmail = (calEvent: Pick<CalendarEvent, "customReplyToEmail" | "organizer">) => {
  return calEvent.customReplyToEmail || calEvent.organizer.email;
};
