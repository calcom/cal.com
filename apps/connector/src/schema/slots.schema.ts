import { z } from "zod";

export const slotsQuerySchema = z.object({
  eventTypeId: z.string().optional(),
  eventTypeSlug: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  timeZone: z.string().optional(),
  duration: z.number().int().optional(),
  format: z.enum(["time", "range"]).optional(),
  bookingUidToReschedule: z.string().optional(),
});

export const slotRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const slotsResponseSchema = z.object({
  slots: z.record(
    z.string(),
    z.array(
      z.object({
        time: z.string(),
      })
    )
  ),
});
