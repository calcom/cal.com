import { z } from "zod";

import { _AvailabilityModel } from "@calcom/prisma/zod";

export const scheduleSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  name: z.string(),
  availability: z.array(_AvailabilityModel),
  timeZone: z.string(),
});

export const scheduleBodySchema = z.object({
  name: z.string(),
  timeZone: z.string(),
});
