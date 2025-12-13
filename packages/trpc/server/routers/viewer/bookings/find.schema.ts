import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TFindInputSchema = {
  bookingUid?: string;
};

export const ZFindInputSchema: z.ZodType<TFindInputSchema> = z.object({
  bookingUid: z.string().optional(),
});
