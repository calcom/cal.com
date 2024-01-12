import { z } from "zod";

export const ZOutOfOfficeInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  toTeamUserId: z.number().nullable(),
});

export type TOutOfOfficeInputSchema = z.infer<typeof ZOutOfOfficeInputSchema>;

export const ZOutOfOfficeDelete = z.object({
  outOfOfficeUid: z.string(),
});

export type TOutOfOfficeDelete = z.infer<typeof ZOutOfOfficeDelete>;
