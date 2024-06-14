import type { NextApiRequest, NextApiResponse } from "next";

import { listOOOEntries } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { validateAccountOrApiKey } from "../../lib/validateAccountOrApiKey";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { account: authorizedAccount, appApiKey: validKey } = await validateAccountOrApiKey(req, [
    "READ_PROFILE",
  ]);
  if (!authorizedAccount && !validKey) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const oooEntries = await listOOOEntries(validKey, authorizedAccount);

  if (!oooEntries) {
    return res.status(500).json({ message: "Unable to get out of office entries list." });
  }
  if (oooEntries.length === 0) {
    return res.status(201).json([]);
  }
  res.status(201).json(oooEntries);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
