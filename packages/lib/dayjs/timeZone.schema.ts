import { z } from "zod";

import { isSupportedTimeZone } from "./index";

// Schema for validating IANA timezone strings compatible with Intl.DateTimeFormat
export const timeZoneSchema = z.string().transform((timeZone) => {
  // Browserstack and may be some automations end up giving us +00:00 as the timezone which isn't as per IANA standards and technically browser shouldn't give this value in the first place
  // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions#timezone
  if (timeZone === "+00:00") {
    return timeZone
  }
  return timeZone;
}).refine((timeZone) => isSupportedTimeZone(timeZone), { message: "Invalid timezone. Must be a valid IANA timezone string." });
