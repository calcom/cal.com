import { deleteSubscription } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";
import { validateAccountOrApiKey } from "../../lib/validateAccountOrApiKey";

const querySchema = z.object({
  apiKey: z.string(),
  id: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = querySchema.parse(req.query);

  const { account, appApiKey } = await validateAccountOrApiKey(req, ["READ_BOOKING", "READ_PROFILE"]);

  const deleteEventSubscription = await deleteSubscription({
    appApiKey,
    account,
    webhookId: id,
    appId: "zapier",
  });

  if (!deleteEventSubscription) {
    return res.status(500).json({ message: "Could not delete subscription." });
  }
  res.status(204).json({ message: "Subscription is deleted." });
}

export default defaultHandler({
  DELETE: Promise.resolve({ default: defaultResponder(handler) }),
});
