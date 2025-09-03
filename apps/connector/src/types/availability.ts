import { z } from "zod";

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
