import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TEditInputSchema = {
  id: string;
  note?: string | null;
  expiresAt?: Date;
};

export const ZEditInputSchema: z.ZodType<TEditInputSchema> = z.object({
  id: z.string(),
  note: z.string().optional().nullish(),
  expiresAt: z.date().optional(),
});
