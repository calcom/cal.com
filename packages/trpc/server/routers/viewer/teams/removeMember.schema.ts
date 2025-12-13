import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
// Note: isOrg has .default(false), so input type has it optional but output type has it required

// Input type - what callers send (isOrg is optional)
export type TRemoveMemberInputSchemaInput = {
  teamIds: number[];
  memberIds: number[];
  isOrg?: boolean;
};

// Output type - what handlers receive after parsing (isOrg has default, so required)
export type TRemoveMemberInputSchema = {
  teamIds: number[];
  memberIds: number[];
  isOrg: boolean;
};

export const ZRemoveMemberInputSchema: z.ZodType<TRemoveMemberInputSchema, z.ZodTypeDef, TRemoveMemberInputSchemaInput> = z.object({
  teamIds: z.array(z.number()),
  memberIds: z.array(z.number()),
  isOrg: z.boolean().default(false),
});
