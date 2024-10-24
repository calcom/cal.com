import { z } from "zod";

export const watchCalendarSchema = z.object({
  kind: z.literal("api#channel"),
  id: z.string(),
  resourceId: z.string(),
  resourceUri: z.string(),
  expiration: z.string(),
});
