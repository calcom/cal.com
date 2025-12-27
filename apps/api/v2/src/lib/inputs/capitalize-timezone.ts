import { Transform } from "class-transformer";

import { normalizeTimezone } from "@calcom/platform-types";

export function CapitalizeTimeZone(): PropertyDecorator {
  return Transform(({ value }) => normalizeTimezone(value));
}
