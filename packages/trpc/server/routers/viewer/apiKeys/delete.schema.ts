import { z } from "zod";

export type TDeleteInputSchema = {
  id: string;
  eventTypeId?: number;
};

export const ZDeleteInputSchema: z.ZodType<TDeleteInputSchema> = z.object({
  id: z.string(),
  eventTypeId: z.number().optional(),
});
