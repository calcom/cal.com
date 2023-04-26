import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getEventTypeWithUsers } from "@calcom/lib/server/queries/event-type";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const querySchema = z.object({
    eventTypeSlug: z.string(),
    teamSlug: z.string().optional(),
    username: z.string().optional(),
  });
  const { teamSlug, eventTypeSlug, username } = querySchema.parse(req.query);
  const { eventType } = await getEventTypeWithUsers(eventTypeSlug, teamSlug, username);
  return res.status(200).json({ eventType });
}
