import { z } from "zod";

export const ZCreateOneOffMeetingInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  location: z.any().optional(), // Uses same format as EventType.locations
  timeZone: z.string(),
  offeredSlots: z
    .array(
      z.object({
        startTime: z.string().or(z.date()), // ISO string or Date
        endTime: z.string().or(z.date()),
      })
    )
    .min(1, "At least one time slot is required"),
});

export type TCreateOneOffMeetingInputSchema = z.infer<typeof ZCreateOneOffMeetingInputSchema>;

