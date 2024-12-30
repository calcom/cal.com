import z from "zod";

import type { CalendarEvent } from "@calcom/types/Calendar";

export const createCRMEventSchema = z.object({
  credentialId: z.number(),
  bookingUid: z.string(),
  event: z
    .object({
      type: z.string(),
      title: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      attendees: z.array(
        z
          .object({
            email: z.string(),
            name: z.string(),
            timeZone: z.string(),
            language: z
              .object({
                translate: z.function(),
                locale: z.string(),
              })
              .passthrough(),
          })
          .passthrough()
      ),
      organizer: z
        .object({
          email: z.string(),
          name: z.string(),
          timeZone: z.string(),
          language: z
            .object({
              translate: z.function(),
              locale: z.string(),
            })
            .passthrough(),
        })
        .passthrough(),
    })
    .passthrough() as z.ZodType<CalendarEvent>,
});
