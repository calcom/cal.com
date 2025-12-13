import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TListMembersInputSchema = {
  teamId: number;
  limit?: number;
  searchTerm?: string;
  cursor?: number | null;
};

export const ZListMembersInputSchema: z.ZodType<TListMembersInputSchema> = z.object({
  teamId: z.number(),
  limit: z.number().default(10),
  searchTerm: z.string().optional(),
  cursor: z.number().optional().nullable(),
});
