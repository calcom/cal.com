import { z } from "zod";

export const ZNoShowInputSchema = z
  .object({
    bookingUid: z.string(),
    attendees: z
      .array(
        z.object({
          email: z.string(),
          noShow: z.boolean(),
        })
      )
      .optional(),
    noShowHost: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return (data.attendees && data.attendees.length > 0) || data.noShowHost !== undefined;
    },
    {
      message: "At least one of 'attendees' or 'noShowHost' must be provided",
      path: ["attendees", "noShowHost"],
    }
  );

export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;
