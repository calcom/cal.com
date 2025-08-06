import { z } from "zod";

/**
 * @deprecated This schema is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export const watchCalendarSchema = z.object({
  kind: z.literal("api#channel"),
  id: z.string(),
  resourceId: z.string(),
  resourceUri: z.string(),
  expiration: z.string(),
});
