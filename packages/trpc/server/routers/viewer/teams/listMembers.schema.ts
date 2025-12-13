import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
// Note: limit has .default(10), so input type has it optional but output type has it required

// Input type - what callers send (limit is optional)
export type TListMembersInputSchemaInput = {
  teamId: number;
  limit?: number;
  searchTerm?: string;
  cursor?: number | null;
};

// Output type - what handlers receive after parsing (limit has default, so required)
export type TListMembersInputSchema = {
  teamId: number;
  limit: number;
  searchTerm?: string;
  cursor?: number | null;
};

export const ZListMembersInputSchema: z.ZodType<TListMembersInputSchema, z.ZodTypeDef, TListMembersInputSchemaInput> = z.object({
  teamId: z.number(),
  limit: z.number().default(10),
  searchTerm: z.string().optional(),
  cursor: z.number().optional().nullable(),
});
