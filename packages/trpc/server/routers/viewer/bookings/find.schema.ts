import { z } from "zod";

export const ZFindInputSchema = z.object({
  bookingUid: z.string().optional(),
});

export type TFindInputSchema = z.infer<typeof ZFindInputSchema>;
