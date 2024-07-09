import type { NextApiRequest, NextApiResponse } from "next";

import { listOOOEntries } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { validateAccountOrApiKey } from "../../lib/validateAccountOrApiKey";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { account: authorizedAccount, appApiKey: validKey } = await validateAccountOrApiKey(req, [
    "READ_PROFILE",
  ]);
  if (!authorizedAccount && !validKey) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const oooEntries = await listOOOEntries(validKey, authorizedAccount);

  if (!oooEntries) {
    res.status(500).json({ message: "Unable to get out of office entries list." });
    return;
  }
  if (oooEntries.length === 0) {
    res.status(204).json([]);
    return;
  }
  // Wrap entries in metadata object
  const response = oooEntries.map((oooEntry) => {
    return {
      payload: {
        oooEntry: {
          ...oooEntry,
        },
      },
    };
  });
  res.status(200).json(response);
  return;
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
