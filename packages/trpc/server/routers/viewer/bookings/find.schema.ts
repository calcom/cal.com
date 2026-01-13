import { z } from "zod";

export type TFindInputSchema = {
  bookingUid?: string;
};

export const ZFindInputSchema: z.ZodType<TFindInputSchema> = z.object({
  bookingUid: z.string().optional(),
});
