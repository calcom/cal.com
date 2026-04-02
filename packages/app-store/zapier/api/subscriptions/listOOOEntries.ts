import { listOOOEntries } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";
import { validateAccountOrApiKey } from "../../lib/validateAccountOrApiKey";

export const selectOOOEntries = {
  id: true,
  start: true,
  end: true,
  createdAt: true,
  updatedAt: true,
  notes: true,
  showNotePublicly: true,
  reason: {
    select: {
      reason: true,
      emoji: true,
    },
  },
  reasonId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
    },
  },
  toUser: {
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
    },
  },
  uuid: true,
};

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
    res.status(200).json([]);
    return;
  }
  // Wrap entries in metadata object
  const response = oooEntries.map((oooEntry) => {
    return {
      createdAt: oooEntry.createdAt,
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      payload: {
        oooEntry,
      },
    };
  });
  res.status(200).json(response);
  return;
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
