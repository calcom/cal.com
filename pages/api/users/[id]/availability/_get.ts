import type { NextApiRequest } from "next";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { defaultResponder } from "@calcom/lib/server";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

const availabilitySchema = z
  .object({
    id: stringOrNumber,
    username: z.string().optional(),
    dateFrom: z.string(),
    dateTo: z.string(),
    eventTypeId: stringOrNumber.optional(),
  })
  .refine((data) => !!data.username || !!data.id, "Either username or userId should be filled in.");

async function handler(req: NextApiRequest) {
  const { username, id, eventTypeId, dateTo, dateFrom } = availabilitySchema.parse(req.query);
  return getUserAvailability({
    username,
    dateFrom,
    dateTo,
    eventTypeId,
    userId: id,
  });
}

export default defaultResponder(handler);
