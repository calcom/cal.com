import { z } from "zod";

export const writeToBookingEntry = z.object({
  value: z.union([z.string(), z.boolean()]),
  fieldType: z.string(),
  whenToWrite: z.string(),
});

export const writeToRecordEntrySchema = z.object({
  field: z.string(),
  fieldType: z.string(),
  value: z.union([z.string(), z.boolean()]),
  whenToWrite: z.string(),
});
