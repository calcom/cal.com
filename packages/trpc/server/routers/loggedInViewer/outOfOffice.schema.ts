import { z } from "zod";

export const ZOutOfOfficeInputSchema = z.object({
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
  offset: z.number(),
  toTeamUserId: z.number().nullable(),
  reasonId: z.number(),
  notes: z.string().nullable().optional(),
});

export type TOutOfOfficeInputSchema = z.infer<typeof ZOutOfOfficeInputSchema>;

export const ZOutOfOfficeDelete = z.object({
  outOfOfficeUid: z.string(),
});

export type TOutOfOfficeDelete = z.infer<typeof ZOutOfOfficeDelete>;
