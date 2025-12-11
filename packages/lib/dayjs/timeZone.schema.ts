import { z } from "zod";

import { isSupportedTimeZone } from "./index";

// Schema for validating IANA timezone strings compatible with Intl.DateTimeFormat
// Browserstack and some automations return +00:00 as the timezone which isn't a valid IANA timezone
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions#timezone
export const timeZoneSchema = z
  .string()
  .superRefine((timeZone, ctx) => {
    // Allow +00:00 as a special case - it will be transformed to UTC
    if (timeZone === "+00:00") return;
    if (!isSupportedTimeZone(timeZone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid timezone. Must be a valid IANA timezone string.",
      });
    }
  })
  .transform((timeZone) => (timeZone === "+00:00" ? "UTC" : timeZone));
