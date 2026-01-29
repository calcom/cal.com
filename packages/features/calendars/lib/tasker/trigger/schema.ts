import { z } from "zod";

export const calendarsTaskSchema = z.object({
  userId: z.number(),
});

export const backfillGoogleCalendarEventsSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
});
