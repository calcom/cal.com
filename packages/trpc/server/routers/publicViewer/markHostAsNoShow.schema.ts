import { z } from "zod";

export const ZMarkHostAsNoShowInputSchema = z.object({
  bookingUid: z.string(),
  noShowHost: z.boolean(),
});

export type TNoShowInputSchema = z.infer<typeof ZMarkHostAsNoShowInputSchema>;
