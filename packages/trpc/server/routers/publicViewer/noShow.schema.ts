import { z } from "zod";

export const ZNoShowInputSchema = z.object({
  bookingUid: z.string(),
  attendees: z
    .array(
      z.object({
        email: z.string(),
        noShow: z.boolean(),
      })
    )
    .optional(),
});

export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;
