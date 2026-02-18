import { z } from "zod";

import { ABUSE_FLAG_TYPES, ABUSE_SIGNAL_TYPES } from "./constants";

export const abuseMetadataSchema = z.object({
  // Only signup-time flag types — REDIRECT_DOMAIN is a WatchlistType for scoring, not a flag
  flags: z.array(
    z.object({
      type: z.enum(ABUSE_FLAG_TYPES),
      at: z.string().datetime(),
      pattern: z.string().optional(),
      domain: z.string().optional(),
      keyword: z.string().optional(),
    })
  ),
  signals: z.array(
    z.object({
      type: z.enum(ABUSE_SIGNAL_TYPES),
      weight: z.number(),
      context: z.string(),
      at: z.string().datetime(),
    })
  ),
});
