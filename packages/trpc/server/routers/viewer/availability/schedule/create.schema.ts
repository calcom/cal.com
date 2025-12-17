import { z } from "zod";

export type TCreateInputSchema = {
  name: string;
  schedule?: { start: Date; end: Date }[][];
  eventTypeId?: number;
};

export const ZCreateInputSchema: z.ZodType<TCreateInputSchema> = z.object({
  name: z.string(),
  schedule: z
    .array(
      z.array(
        z.object({
          start: z.date(),
          end: z.date(),
        })
      )
    )
    .optional(),
  eventTypeId: z.number().optional(),
});
