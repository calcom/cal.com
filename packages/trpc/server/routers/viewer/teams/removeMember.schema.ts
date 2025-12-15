import { z } from "zod";

// Note: isOrg has .default(false), so input type has it optional but output type has it required

export type TRemoveMemberInputSchemaInput = {
  teamIds: number[];
  memberIds: number[];
  isOrg?: boolean;
};

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
