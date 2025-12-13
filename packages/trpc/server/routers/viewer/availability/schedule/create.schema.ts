import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
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
