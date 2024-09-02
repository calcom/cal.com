import { z } from "zod";

export const ZOutOfOfficeInputSchema = z.object({
  uuid: z.string().nullish(),
  forUserId: z.number().nullable().optional(),
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
  userId: z.number().nullable().optional(),
});

export type TOutOfOfficeDelete = z.infer<typeof ZOutOfOfficeDelete>;

export const ZOutOfOfficeEntriesListSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  fetchTeamMembersEntries: z.boolean().optional().default(false),
  searchTerm: z.string().optional(),
});

export type TOutOfOfficeEntriesListSchema = z.infer<typeof ZOutOfOfficeEntriesListSchema>;
