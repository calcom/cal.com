import { z } from "zod";

import { isSupportedTimeZone } from "./index";

// Schema for validating IANA timezone strings compatible with Intl.DateTimeFormat
export const timeZoneSchema = z.string().refine((timeZone) => isSupportedTimeZone(timeZone), {
  message: "Invalid timezone. Must be a valid IANA timezone string.",
});
