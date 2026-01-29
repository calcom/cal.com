import { z } from "zod";

export const ZOutOfOfficeEntriesListSchema = z.object({
  limit: z.number().min(1).max(100),
  offset: z.number().min(0),
  fetchTeamMembersEntries: z.boolean().optional().default(false),
  searchTerm: z.string().optional(),
  endDateFilterStartRange: z.string().optional(),
  endDateFilterEndRange: z.string().optional(),
});

export type TOutOfOfficeEntriesListSchema = z.infer<typeof ZOutOfOfficeEntriesListSchema>;
