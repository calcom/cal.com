import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { deleteSubscription } from "@calcom/app-store/_utils/nodeScheduler";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

const querySchema = z.object({
  apiKey: z.string(),
  id: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { apiKey, id } = querySchema.parse(req.query);

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "make");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  const deleteEventSubscription = await deleteSubscription({
    appApiKey: validKey,
    webhookId: id,
  });

  if (!deleteEventSubscription) {
    return res.status(500).json({ message: "Could not delete subscription." });
  }
  res.status(204).json({ message: "Subscription is deleted." });
}

export default defaultHandler({
  DELETE: Promise.resolve({ default: defaultResponder(handler) }),
});
