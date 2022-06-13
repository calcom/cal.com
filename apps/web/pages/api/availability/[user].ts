import type { NextApiRequest } from "next";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { defaultResponder } from "@calcom/lib/server";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

const availabilitySchema = z.object({
  user: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  eventTypeId: stringOrNumber.optional(),
});

async function handler(req: NextApiRequest) {
  const { user: username, eventTypeId, dateTo, dateFrom } = availabilitySchema.parse(req.query);
  return getUserAvailability({
    username,
    dateFrom,
    dateTo,
    eventTypeId,
  });
}

export default defaultResponder(handler);
