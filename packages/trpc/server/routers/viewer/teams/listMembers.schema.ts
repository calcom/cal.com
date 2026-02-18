import { z } from "zod";

// Note: limit has .default(10), so input type has it optional but output type has it required

export type TListMembersInputSchemaInput = {
  teamId: number;
  limit?: number;
  searchTerm?: string;
  cursor?: number | null;
};

export type TListMembersInputSchema = {
  teamId: number;
  limit: number;
  searchTerm?: string;
  cursor?: number | null;
};

export const ZListMembersInputSchema: z.ZodType<
  TListMembersInputSchema,
  z.ZodTypeDef,
  TListMembersInputSchemaInput
> = z.object({
  teamId: z.number(),
  limit: z.number().default(10),
  searchTerm: z.string().optional(),
  cursor: z.number().optional().nullable(),
});
