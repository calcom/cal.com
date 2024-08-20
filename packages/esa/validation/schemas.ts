import { z } from "zod";

export const setupManagedZohoUserRequestSchema = z.object({
  zuid: z.string(),
  email: z.string().email(),
  name: z.string(),
  timeZone: z.string(),
  schedule: z
    .array(
      z.array(
        z.object({
          start: z.date(),
          end: z.date(),
        })
      )
    )
    .optional(),
  zoomUserId: z.string(),
});

export const updateManagedZohoUserRequestSchema = z.object({
  zuid: z.string(),
  schedule: z
    .array(
      z.array(
        z.object({
          start: z.date(),
          end: z.date(),
        })
      )
    )
    .optional(),
  zoomUserId: z.string(),
});
