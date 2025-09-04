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

export const reservationBodySchema = z.object({
  eventTypeId: z.number().int().positive(),
  slotStart: z.string().datetime({ offset: true }), // ISO8601 with timezone (Z)
  slotDuration: z.union([z.string(), z.number()]).optional(), // "30" is a string here
  reservationDuration: z.number().int().positive().optional(),
});

export const reservationResponseSchema = z.object({
  eventTypeId: z.number().int().positive(),

  slotStart: z.string().datetime({ offset: true }),
  slotEnd: z.string().datetime({ offset: true }),

  slotDuration: z.coerce.number().int().positive(),

  reservationUid: z.string().uuid(),

  reservationDuration: z.number().int().positive(),
  reservationUntil: z.string().datetime({ offset: true }),
});
