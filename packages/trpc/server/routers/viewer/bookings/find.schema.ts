import { z } from "zod";

const ZFindInputSchema = z.object({
  bookingUid: z.string().optional(),
});

type TFindInputSchema = z.infer<typeof ZFindInputSchema>;

export { ZFindInputSchema, TFindInputSchema };
