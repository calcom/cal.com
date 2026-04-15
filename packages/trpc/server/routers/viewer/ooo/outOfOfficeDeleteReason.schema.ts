import { z } from "zod";

export const ZDeleteCustomReasonSchema = z.object({
  id: z.number(),
});

export type TDeleteCustomReasonSchema = z.infer<typeof ZDeleteCustomReasonSchema>;
