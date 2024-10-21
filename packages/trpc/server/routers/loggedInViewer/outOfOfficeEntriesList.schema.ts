import { z } from "zod";

export enum OutOfOfficeRecordType {
  CURRENT = "current",
  PREVIOUS = "previous",
}

export const ZOutOfOfficeEntriesListSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  fetchTeamMembersEntries: z.boolean().optional().default(false),
  searchTerm: z.string().optional(),
  recordType: z.nativeEnum(OutOfOfficeRecordType).default(OutOfOfficeRecordType.CURRENT),
});

export type TOutOfOfficeEntriesListSchema = z.infer<typeof ZOutOfOfficeEntriesListSchema>;
