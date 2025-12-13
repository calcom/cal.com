import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TGetInputSchema = {
  teamId: number;
  isOrg?: boolean;
};

export const ZGetSchema: z.ZodType<TGetInputSchema> = z.object({
  teamId: z.number(),
  isOrg: z.boolean().optional(),
});
