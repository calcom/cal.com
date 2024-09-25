import { z } from "zod";

export const ZOutOfOfficeInputSchema = z.object({
  uuid: z.string().nullish(),
  forUserId: z.number().nullish(),
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
