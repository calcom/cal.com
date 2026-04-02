import { normalizeTimezone } from "@calcom/platform-types";
import { Transform } from "class-transformer";

export function CapitalizeTimeZone(): PropertyDecorator {
  return Transform(({ value }) => normalizeTimezone(value));
}
