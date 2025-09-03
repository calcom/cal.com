import { z } from "zod";
import {_AvailabilityModel} from "@calcom/prisma/zod/availability"

export const availabilityCreationSchema = z
  .object({
    scheduleId: z.number(),
    startTime: z.date().or(z.string()),
    endTime: z.date().or(z.string()),
    days: z.array(z.number()).optional(),
  })
  .strict();

export type AvailabilityCreation = z.infer<typeof availabilityCreationSchema>;


export const availabilitySchema = z
  .object({
    eventTypeId: z.number(),
    dateTo: z.string(),
    dateFrom: z.string()
  })
  .strict();

export type AvailabilitySchema = z.infer<typeof availabilityCreationSchema>;

const dateTimeString = z.string().datetime();

const busyItemSchema = z.object({
  start: z.string(),
  end: z.string(),
  title: z.string(),
});

const dateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const workingHourSchema = z.object({
  days: z.array(z.number()),
  startTime: z.number(),
  endTime: z.number(),
  userId: z.number(),
});

export const availabilityQueryResponseSchema = z.object({
  busy: z.array(busyItemSchema),
  timeZone: z.string(),
  dateRanges: z.array(dateRangeSchema),
  oooExcludedDateRanges: z.array(dateRangeSchema),
  workingHours: z.array(workingHourSchema),
  dateOverrides: z.array(z.any()),
  currentSeats: z.nullable(z.any()),
  datesOutOfOffice: z.record(z.any()),
});

// Extension schema—adds Schedule field
export const availabilityWithScheduleSchema = _AvailabilityModel.extend({
  Schedule: z.object({
    userId: z.number().int(),
  }),
});

export const availabilityCreationBodySchema = z.object({
  scheduleId: z.number(),
  days: z.array(z.any()),
  startTime: z.string(),
  endTime: z.string(),
});

export const availabilityQueryStringSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  eventTypeId: z.number(),
});
