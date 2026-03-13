import { z } from "zod";

export type TCreateInputSchema = {
  note?: string | null;
  expiresAt?: Date | null;
  neverExpires?: boolean;
  appId?: string | null;
  teamId?: number;
  keyType?: "api_key" | "agent";
};

export const ZCreateInputSchema: z.ZodType<TCreateInputSchema> = z.object({
  note: z.string().optional().nullish(),
  expiresAt: z.date().optional().nullable(),
  neverExpires: z.boolean().optional(),
  appId: z.string().optional().nullable(),
  teamId: z.number().optional(),
  keyType: z.enum(["api_key", "agent"]).optional(),
});
