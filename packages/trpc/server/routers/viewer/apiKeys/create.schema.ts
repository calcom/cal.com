import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TCreateInputSchema = {
  note?: string | null;
  expiresAt?: Date | null;
  neverExpires?: boolean;
  appId?: string | null;
  teamId?: number;
};

export const ZCreateInputSchema: z.ZodType<TCreateInputSchema> = z.object({
  note: z.string().optional().nullish(),
  expiresAt: z.date().optional().nullable(),
  neverExpires: z.boolean().optional(),
  appId: z.string().optional().nullable(),
  teamId: z.number().optional(),
});
