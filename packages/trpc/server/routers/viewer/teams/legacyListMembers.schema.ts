import { z } from "zod";

export const ZListMembersInputSchema = z.object({
  teamIds: z.number().array().optional(),
  searchText: z.string().optional(),
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(),
  adminOrOwnedTeamsOnly: z.boolean().optional(),
});

export const ZLegacyListMembersInputSchema = ZListMembersInputSchema.extend({});

export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
export type TLegacyListMembersInputSchema = z.infer<typeof ZLegacyListMembersInputSchema>;
