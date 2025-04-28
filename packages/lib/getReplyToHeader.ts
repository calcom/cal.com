import type { CalendarEvent } from "@calcom/types/Calendar";

import { getReplyToEmail } from "./getReplyToEmail";

export function getReplyToHeader(calEvent: CalendarEvent, additionalEmails?: string | string[]) {
  if (calEvent.hideOrganizerEmail) return {};

  const replyToEmail = getReplyToEmail(calEvent);
  const replyTo = additionalEmails
    ? Array.isArray(additionalEmails)
      ? [...additionalEmails, replyToEmail]
      : [additionalEmails, replyToEmail]
    : replyToEmail;

  return { replyTo };
}
