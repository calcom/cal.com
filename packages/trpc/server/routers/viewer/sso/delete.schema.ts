import { z } from "zod";

export type TDeleteInputSchema = {
  teamId: number | null;
};

export const ZDeleteInputSchema: z.ZodType<TDeleteInputSchema> = z.object({
  teamId: z.union([z.number(), z.null()]),
});
