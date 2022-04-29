import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

/**
 * This is an example endpoint for an app, these will run under `/api/integrations/[...args]`
 * @param req
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🚀 ~ file: add.ts ~ line 11 ~ handler ~ req", req.method);
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const appType = "metamask_web3";
  console.log("🚀 ~ file: add.ts ~ line 17 ~ handler ~ appType", appType);
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        userId: req.session.user.id,
      },
    });
    console.log("🚀 ~ file: add.ts ~ line 25 ~ handler ~ alreadyInstalled", alreadyInstalled);
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: { isWeb3Active: true },
        userId: req.session.user.id,
      },
    });
    console.log("🚀 ~ file: add.ts ~ line 35 ~ handler ~ installation", installation);
    if (!installation) {
      throw new Error("Unable to create user credential for metamask");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }
  return res.redirect("/apps/installed");
}
