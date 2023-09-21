import type { NextApiRequest, NextApiResponse } from "next";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { addSubscription } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "make");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  const { subscriberUrl, triggerEvent } = req.body;

  const createAppSubscription = await addSubscription({
    appApiKey: validKey,
    triggerEvent: triggerEvent,
    subscriberUrl: subscriberUrl,
    appId: "make",
  });

  if (!createAppSubscription) {
    return res.status(500).json({ message: "Could not create subscription." });
  }

  res.status(200).json(createAppSubscription);
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
