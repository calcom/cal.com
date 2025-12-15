import { z } from "zod";

export type TPublishInputSchema = {
  teamId: number;
};

export const ZPublishInputSchema: z.ZodType<TPublishInputSchema> = z.object({
  teamId: z.coerce.number(),
});
