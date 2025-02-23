import { z } from "zod";

export const ZMarkHostAsNoShowOptionsSchema = z.object({
  bookingUid: z.string(),
  noShowHost: z.boolean(),
});

export type TNoShowOptionsSchema = z.infer<typeof ZMarkHostAsNoShowOptionsSchema>;
