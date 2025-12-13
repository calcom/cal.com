import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TPublishInputSchema = {
  teamId: number;
};

export const ZPublishInputSchema: z.ZodType<TPublishInputSchema> = z.object({
  teamId: z.coerce.number(),
});
