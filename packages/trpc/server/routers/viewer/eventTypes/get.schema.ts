import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TGetInputSchema = {
  id: number;
};

export const ZGetInputSchema: z.ZodType<TGetInputSchema> = z.object({
  id: z.number(),
});
