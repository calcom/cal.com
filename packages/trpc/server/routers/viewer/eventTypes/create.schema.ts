import { z } from "zod";

import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";

export const ZCreateInputSchema = z.intersection(
  createEventTypeInput,
  z.object({
    oneOffAvailabilities: z
      .object({
        startTime: z.string(),
        endTime: z.string(),
        date: z.string(),
      })
      .array()
      .optional(),
  })
);

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
