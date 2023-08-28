import type { NextApiRequest, NextApiResponse } from "next";

import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import prisma from "@calcom/prisma";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer/_router";

const appType = "cal-ai_automation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        userId: req.session.user.id,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }

    const ctx = await createContext({ req, res });
    const caller = viewerRouter.createCaller(ctx);

    const event = { note: "Cal AI", expiresAt: null, appId: "cal-ai" };
    const apiKey = await caller.apiKeys.create({ userId: req.session.user.id, event });

    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {
          apiKey: apiKey,
        },
        userId: req.session.user.id,
        appId: "cal-ai",
      },
    });
    if (!installation) {
      throw new Error("Unable to create user credential for cal ai");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res.status(200).json({ url: getInstalledAppPath({ variant: "automation", slug: "cal-ai" }) });
}
