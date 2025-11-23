import type { CalendarEvent } from "@calcom/types/Calendar";

/**
 * Returns the reply-to email address to use, with fallback to organizer's email
 */
export const getReplyToEmail = (
  calEvent: Pick<CalendarEvent, "customReplyToEmail" | "organizer">,
  excludeOrganizerEmail?: boolean
) => {
  if (calEvent.customReplyToEmail) {
    return calEvent.customReplyToEmail;
  }

  if (excludeOrganizerEmail) {
    return null;
  }

  return calEvent.organizer.email;
};
