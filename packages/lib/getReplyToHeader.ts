import type { CalendarEvent } from "@calcom/types/Calendar";

import { getReplyToEmail } from "./getReplyToEmail";

export function getReplyToHeader(
  calEvent: CalendarEvent,
  additionalEmails?: string | string[],
  excludeOrganizerEmail?: boolean
) {
  // When hiding organizer email, exclude it from reply-to unless there's a custom reply-to email
  const shouldExcludeOrganizerEmail = excludeOrganizerEmail || calEvent.hideOrganizerEmail;
  const replyToEmail = getReplyToEmail(calEvent, shouldExcludeOrganizerEmail);
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
