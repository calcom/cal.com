import { z } from "zod";

import { abuseMetadataSchema } from "../lib/abuseMetadataSchema";

export const watchlistPatternDtoSchema = z.object({
  type: z.string(),
  value: z.string(),
});
export type WatchlistPatternDto = z.infer<typeof watchlistPatternDtoSchema>;

const eventTypeForScoringDtoSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  successRedirectUrl: z.string().nullable(),
  forwardParamsSuccessRedirect: z.boolean().nullable(),
});

const bookingForScoringDtoSchema = z.object({
  createdAt: z.date(),
  eventType: z.object({ userId: z.number() }).nullable(),
  attendees: z.array(z.object({ email: z.string() })),
});

export const userForScoringDtoSchema = z.object({
  id: z.number(),
  email: z.string(),
  // Parsed at the DTO boundary — malformed JSONB falls back to null (fail-open)
  abuseData: abuseMetadataSchema.nullable().catch(null),
  locked: z.boolean(),
  abuseScore: z.number(),
  eventTypes: z.array(eventTypeForScoringDtoSchema),
  bookings: z.array(bookingForScoringDtoSchema),
});
export type UserForScoringDto = z.infer<typeof userForScoringDtoSchema>;

export const userForMonitoringDtoSchema = z.object({
  abuseData: abuseMetadataSchema.nullable().catch(null),
  createdDate: z.date(),
  locked: z.boolean(),
});
export type UserForMonitoringDto = z.infer<typeof userForMonitoringDtoSchema>;
