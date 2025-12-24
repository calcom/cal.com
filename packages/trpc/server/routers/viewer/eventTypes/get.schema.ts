import { z } from "zod";

export type TGetInputSchema = {
  id: number;
};

export const ZGetInputSchema: z.ZodType<TGetInputSchema> = z.object({
  id: z.number(),
});
