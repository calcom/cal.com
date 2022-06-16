import type { NextApiRequest } from "next";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { defaultResponder } from "@calcom/lib/server";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

const availabilitySchema = z
  .object({
    userId: stringOrNumber.optional(),
    username: z.string().optional(),
    dateFrom: z.string(),
    dateTo: z.string(),
    eventTypeId: stringOrNumber.optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

async function handler(req: NextApiRequest) {
  const { username, userId, eventTypeId, dateTo, dateFrom } = availabilitySchema.parse(req.query);
  return getUserAvailability({
    username,
    dateFrom,
    dateTo,
    eventTypeId,
    userId,
  });
}

export default defaultResponder(handler);
