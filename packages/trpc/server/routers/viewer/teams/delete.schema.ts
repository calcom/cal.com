import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TDeleteInputSchema = {
  teamId: number;
};

export const ZDeleteInputSchema: z.ZodType<TDeleteInputSchema> = z.object({
  teamId: z.number(),
});
