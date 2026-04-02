import { z } from "zod";
import { CrmFieldType, WhenToWrite } from "./crm-enums";

export const writeToBookingEntry = z.object({
  value: z.union([z.string(), z.boolean()]),
  fieldType: z.nativeEnum(CrmFieldType),
  whenToWrite: z.nativeEnum(WhenToWrite),
});

export const writeToRecordEntrySchema = z.object({
  field: z.string(),
  fieldType: z.nativeEnum(CrmFieldType),
  value: z.union([z.string(), z.boolean()]),
  whenToWrite: z.nativeEnum(WhenToWrite),
});
