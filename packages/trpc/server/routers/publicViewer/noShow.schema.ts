import { z } from "zod";

export const ZNoShowInputSchema = z.object({
  bookingUid: z.string(),
  token: z.string(),
});

export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;
