import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { deleteSubscription } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

const querySchema = z.object({
  apiKey: z.string(),
  id: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { apiKey, id } = querySchema.parse(req.query);

  const scopes = ["READ_BOOKING, READ_PROFILE"];

  let validKey: any = null;

  if (apiKey) {
    validKey = await findValidApiKey(apiKey, "zapier");
    if (!validKey) {
      return res.status(401).json({ message: "API key not valid" });
    }
  }

  let authorizedAccount: {
    id: number;
    name: string | null;
    isTeam: boolean;
  } | null = null;

  if (!apiKey) {
    authorizedAccount = await isAuthorized(req, scopes);
  }

  if (!authorizedAccount && !validKey) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const deleteEventSubscription = await deleteSubscription({
    appApiKey: validKey,
    account: authorizedAccount,
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
