import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TCreateInputSchema = {
  teamId?: number;
};

export const ZCreateInputSchema: z.ZodType<TCreateInputSchema> = z.object({
  teamId: z.number().optional(),
});
