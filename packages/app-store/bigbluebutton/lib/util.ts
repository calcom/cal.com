import { createHash } from "crypto";

import type { Person } from "@calcom/types/Calendar";

export const applyMeetingUrlTemplate = (urlTemplate: string, attendeeHash: string, isOrganizer = false) => {
  if (!attendeeHash || !urlTemplate) return urlTemplate;
  return urlTemplate.replace("{ATTENDEE_HASH}", isOrganizer ? "" : attendeeHash);
};

export const hashAttendee = (attendee: Pick<Person, "name" | "email">) =>
  createHash("sha256").update(`${attendee.name}${attendee.email}`).digest("hex");
