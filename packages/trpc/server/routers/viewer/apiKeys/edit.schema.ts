import { z } from "zod";

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
