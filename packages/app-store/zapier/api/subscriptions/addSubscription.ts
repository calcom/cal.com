import type { NextApiRequest, NextApiResponse } from "next";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { addSubscription } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  let validKey;

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
    authorizedAccount = await isAuthorized(req, ["READ_BOOKING", "READ_PROFILE"]);
  }

  if (!authorizedAccount && !validKey) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { subscriberUrl, triggerEvent } = req.body;

  const createAppSubscription = await addSubscription({
    appApiKey: validKey,
    account: authorizedAccount,
    triggerEvent: triggerEvent,
    subscriberUrl: subscriberUrl,
    appId: "zapier",
  });

  if (!createAppSubscription) {
    return res.status(500).json({ message: "Could not create subscription." });
  }

  res.status(200).json(createAppSubscription);
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
