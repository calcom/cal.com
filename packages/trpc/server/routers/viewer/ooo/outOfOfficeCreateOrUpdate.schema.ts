import { z } from "zod";

export const ZOutOfOfficeInputSchema = z.object({
  uuid: z.string().nullish(),
  forUserId: z.number().nullish(),
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
  startDateOffset: z.number(),
  endDateOffset: z.number(),
  toTeamUserId: z.number().nullable(),
  reasonId: z.number().optional(),
  notes: z.string().nullable().optional(),
  showNotePublicly: z.boolean().optional(),
  // HRMS integration fields - optional, only used when HRMS is installed
  hrmsReasonId: z.string().nullable().optional(),
  hrmsReasonName: z.string().nullable().optional(),
});

export type TOutOfOfficeInputSchema = z.infer<typeof ZOutOfOfficeInputSchema>;
