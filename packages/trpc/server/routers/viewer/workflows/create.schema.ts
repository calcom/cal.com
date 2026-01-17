import { z } from "zod";

export type TCreateInputSchema = {
  teamId?: number;
};

export const ZCreateInputSchema: z.ZodType<TCreateInputSchema> = z.object({
  teamId: z.number().optional(),
});
