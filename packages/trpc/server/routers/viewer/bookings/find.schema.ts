import { z } from "zod";

const ZFindInputSchema = z.object({
  bookingUid: z.string().optional(),
});

export type TFindInputSchema = z.infer<typeof ZFindInputSchema>;

export { ZFindInputSchema };
