import type { CalendarEvent } from "@calcom/types/Calendar";

import { getReplyToEmail } from "./getReplyToEmail";

export function getReplyToHeader(
  calEvent: CalendarEvent,
  additionalEmails?: string | string[],
  excludeOrganizerEmail?: boolean
) {
  if (calEvent.hideOrganizerEmail) return {};

  const replyToEmail = getReplyToEmail(calEvent, excludeOrganizerEmail);
  const emailArray: string[] = [];

  if (additionalEmails) {
    if (Array.isArray(additionalEmails)) {
      emailArray.push(...additionalEmails);
    } else {
      emailArray.push(additionalEmails);
    }
  }

  if (replyToEmail) {
    emailArray.push(replyToEmail);
  }

  if (emailArray.length === 0) {
    return {};
  }

  const replyTo = emailArray.length === 1 ? emailArray[0] : emailArray;
  return { replyTo };
}
