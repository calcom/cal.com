import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appConfig.type,
        userId: req.session.user.id,
      },
      select: { id: true },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appConfig.type,
        key: {},
        userId: req.session.user.id,
        appId: appConfig.slug,
      },
    });
    if (!installation) {
      throw new Error("Unable to create user credential for BTCPay server");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }
  return res.status(200).json({ url: "/apps/btcpayserver/setup" });
}
