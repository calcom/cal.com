import { createHash } from "node:crypto";

import type { Person } from "@calcom/types/Calendar";

export const hashAttendee = (attendee: Pick<Person, "name" | "email">) =>
  createHash("sha256").update(`${attendee.name}${attendee.email}`).digest("hex");
