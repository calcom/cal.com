import { z } from "zod";

export const ABUSE_SCORING_REASONS = [
  "signup",
  "event_type_change",
  "booking_created",
  "booking_cancelled",
] as const;

export type AbuseScoringReason = (typeof ABUSE_SCORING_REASONS)[number];

export const abuseScoringTaskSchema = z.object({
  userId: z.number(),
  reason: z.enum(ABUSE_SCORING_REASONS),
});
