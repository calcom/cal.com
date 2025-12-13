import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TRemoveMemberInputSchema = {
  teamIds: number[];
  memberIds: number[];
  isOrg?: boolean;
};

export const ZRemoveMemberInputSchema: z.ZodType<TRemoveMemberInputSchema> = z.object({
  teamIds: z.array(z.number()),
  memberIds: z.array(z.number()),
  isOrg: z.boolean().default(false),
});
