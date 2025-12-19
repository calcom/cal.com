import { z } from "zod";

export type TDeleteInputSchema = {
  id: number;
};

export const ZDeleteInputSchema: z.ZodType<TDeleteInputSchema> = z.object({
  id: z.number(),
});
